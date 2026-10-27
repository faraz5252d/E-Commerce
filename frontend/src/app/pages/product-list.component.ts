import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Category, Product } from '../core/models';
import { errorMessage } from '../core/http-error';
import { ProductCardComponent } from '../shared/product-card.component';

@Component({
  selector: 'app-product-list',
  imports: [FormsModule, ProductCardComponent],
  template: `
    <div class="container page">
      <h1 class="page-title">All Products</h1>

      <form class="filters" (ngSubmit)="applySearch()">
        <input type="search" name="search" [(ngModel)]="searchText" placeholder="Search by product name..." aria-label="Search products" />
        <select name="category" [ngModel]="category()" (ngModelChange)="changeCategory($event)" aria-label="Category">
          <option value="All">All Categories</option>
          @for (c of categories(); track c.name) {
            <option [value]="c.name">{{ c.name }} ({{ c.count }})</option>
          }
        </select>
        <select name="sort" [ngModel]="sort()" (ngModelChange)="changeSort($event)" aria-label="Sort by">
          <option value="">Sort: Default</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name: A to Z</option>
          <option value="name_desc">Name: Z to A</option>
          <option value="rating_desc">Rating: High to Low</option>
          <option value="newest">Newest first</option>
        </select>
        <button class="btn btn-primary" type="submit">Search</button>
        @if (hasFilters()) {
          <button class="btn btn-outline" type="button" (click)="clearFilters()">Clear</button>
        }
      </form>

      @if (error()) {
        <div class="alert alert-error">
          {{ error() }}
          <button class="btn btn-outline btn-sm" type="button" (click)="load()">Try again</button>
        </div>
      }

      @if (loading()) {
        <div class="spinner" role="status" aria-label="Loading products"></div>
      } @else if (!error()) {
        @if (products().length === 0) {
          <div class="empty">
            <div class="empty-icon">🔍</div>
            <h3>No products found</h3>
            <p>Try a different search word or clear the filters.</p>
            <button class="btn btn-primary" type="button" (click)="clearFilters()">Show all products</button>
          </div>
        } @else {
          <p class="result-count">Showing {{ products().length }} of {{ total() }} products</p>
          <div class="product-grid">
            @for (p of products(); track p.id) {
              <app-product-card [product]="p" />
            }
          </div>

          @if (totalPages() > 1) {
            <nav class="pagination" aria-label="Pages">
              <button class="btn btn-outline btn-sm" type="button" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">‹ Prev</button>
              @for (n of pageNumbers(); track n) {
                <button class="btn btn-sm" type="button" [class.btn-primary]="n === page()" [class.btn-outline]="n !== page()" (click)="goToPage(n)">
                  {{ n }}
                </button>
              }
              <button class="btn btn-outline btn-sm" type="button" [disabled]="page() >= totalPages()" (click)="goToPage(page() + 1)">Next ›</button>
            </nav>
          }
        }
      }
    </div>
  `
})
export class ProductListComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private sub?: Subscription;

  searchText = '';
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  category = signal('All');
  sort = signal('');
  page = signal(1);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  error = signal('');

  private search = '';

  ngOnInit(): void {
    this.api.getCategories().subscribe({ next: (c) => this.categories.set(c), error: () => undefined });

    // Every time the URL's ?search=&category=&sort=&page= changes, reload the products
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.search = params.get('search') ?? '';
      this.searchText = this.search;
      this.category.set(params.get('category') ?? 'All');
      this.sort.set(params.get('sort') ?? '');
      const pageNo = parseInt(params.get('page') ?? '1', 10);
      this.page.set(Number.isInteger(pageNo) && pageNo > 0 ? pageNo : 1);
      this.load();
    });
  }

  load(): void {
    this.sub?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.sub = this.api
      .getProducts({ search: this.search, category: this.category(), sort: this.sort(), page: this.page(), limit: 8 })
      .subscribe({
        next: (res) => {
          this.products.set(res.items);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.page.set(res.page);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e, 'Could not load products.'));
          this.products.set([]);
          this.loading.set(false);
        }
      });
  }

  hasFilters(): boolean {
    return !!this.search || this.category() !== 'All' || !!this.sort();
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  applySearch(): void {
    this.updateUrl({ search: this.searchText.trim() || null, page: null });
  }

  changeCategory(value: string): void {
    this.updateUrl({ category: value === 'All' ? null : value, page: null });
  }

  changeSort(value: string): void {
    this.updateUrl({ sort: value || null, page: null });
  }

  goToPage(n: number): void {
    this.updateUrl({ page: n > 1 ? n : null });
  }

  clearFilters(): void {
    this.router.navigate(['/products']);
  }

  /** Merges the changed values into the URL; a null value removes that parameter. */
  private updateUrl(changes: Record<string, string | number | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: changes, queryParamsHandling: 'merge' });
  }
}
