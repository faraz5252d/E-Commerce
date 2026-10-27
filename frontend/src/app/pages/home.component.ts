import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Category, Product } from '../core/models';
import { errorMessage } from '../core/http-error';
import { ProductCardComponent } from '../shared/product-card.component';

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: '💻',
  Fashion: '👗',
  'Home & Kitchen': '🏠',
  Books: '📚',
  Sports: '⚽',
  Beauty: '💄'
};

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink, ProductCardComponent],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-text">
          <span class="hero-tag">Festive Sale · Up to 50% OFF</span>
          <h1>Everything you love, delivered to your door.</h1>
          <p>Shop gadgets, fashion, home essentials and more. Pay with Cash on Delivery - no cards needed.</p>
          <a routerLink="/products" class="btn btn-light btn-lg">Shop Now</a>
        </div>
        <div class="hero-art" aria-hidden="true">🛍️</div>
      </div>
    </section>

    <section class="container search-section">
      <form class="search-bar" (ngSubmit)="search()" role="search">
        <input type="search" name="q" [(ngModel)]="searchText" placeholder="Search products by name..." aria-label="Search products" />
        <button class="btn btn-primary" type="submit">Search</button>
      </form>
    </section>

    <section class="container section" id="categories">
      <h2 class="section-title">Shop by Category</h2>
      @if (categories().length === 0 && !error()) {
        <div class="category-grid">
          @for (n of [1, 2, 3, 4, 5, 6]; track n) {
            <div class="category-tile skeleton"></div>
          }
        </div>
      } @else {
        <div class="category-grid">
          @for (c of categories(); track c.name) {
            <a class="category-tile" routerLink="/products" [queryParams]="{ category: c.name }">
              <span class="cat-icon">{{ icon(c.name) }}</span>
              <strong>{{ c.name }}</strong>
              <small>{{ c.count }} items</small>
            </a>
          }
        </div>
      }
    </section>

    @if (error()) {
      <div class="container">
        <div class="alert alert-error">{{ error() }}</div>
      </div>
    }

    <section class="container section">
      <div class="section-head">
        <h2 class="section-title">Featured Products</h2>
        <a routerLink="/products" class="link">View all →</a>
      </div>
      <div class="product-grid">
        @for (p of featured(); track p.id) {
          <app-product-card [product]="p" />
        }
      </div>
      @if (loading()) {
        <div class="spinner" role="status" aria-label="Loading"></div>
      }
    </section>

    <section class="offers">
      <div class="container">
        <h2 class="section-title light">🔥 Special Offers</h2>
        <p class="offers-sub">Biggest discounts right now</p>
        <div class="product-grid">
          @for (p of offers(); track p.id) {
            <app-product-card [product]="p" />
          }
        </div>
      </div>
    </section>

    <section class="container section">
      <div class="section-head">
        <h2 class="section-title">Latest Arrivals</h2>
        <a routerLink="/products" [queryParams]="{ sort: 'newest' }" class="link">See more →</a>
      </div>
      <div class="product-grid">
        @for (p of latest(); track p.id) {
          <app-product-card [product]="p" />
        }
      </div>
    </section>
  `
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  searchText = '';
  categories = signal<Category[]>([]);
  featured = signal<Product[]>([]);
  latest = signal<Product[]>([]);
  offers = signal<Product[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.api.getCategories().subscribe({
      next: (c) => this.categories.set(c),
      error: (e) => this.error.set(errorMessage(e, 'Could not load categories.'))
    });
    this.api.getProducts({ featured: true, limit: 4 }).subscribe({
      next: (r) => {
        this.featured.set(r.items);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e, 'Could not load products.'));
        this.loading.set(false);
      }
    });
    this.api.getProducts({ offers: true, limit: 4 }).subscribe({
      next: (r) => this.offers.set(r.items),
      error: () => undefined
    });
    this.api.getProducts({ sort: 'newest', limit: 4 }).subscribe({
      next: (r) => this.latest.set(r.items),
      error: () => undefined
    });
  }

  icon(name: string): string {
    return CATEGORY_ICONS[name] ?? '🛒';
  }

  search(): void {
    const q = this.searchText.trim();
    this.router.navigate(['/products'], { queryParams: q ? { search: q } : {} });
  }
}
