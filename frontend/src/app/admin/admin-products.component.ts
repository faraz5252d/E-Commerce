import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { Product } from '../core/models';
import { errorMessage, fieldErrors } from '../core/http-error';

@Component({
  selector: 'app-admin-products',
  imports: [ReactiveFormsModule, FormsModule, CurrencyPipe],
  template: `
    <div class="section-head">
      <h2>Products &amp; Inventory</h2>
      <button type="button" class="btn btn-primary" (click)="startNew()">+ Add product</button>
    </div>

    @if (showForm()) {
      <form class="card form-card" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h3>{{ editingId() ? 'Edit product' : 'New product' }}</h3>
        @if (formError()) {
          <div class="alert alert-error">{{ formError() }}</div>
        }
        <div class="field">
          <label for="pn">Name</label>
          <input id="pn" type="text" formControlName="name" />
          @if (msg('name'); as m) { <small class="field-error">{{ m }}</small> }
        </div>
        <div class="field">
          <label for="pd">Description</label>
          <textarea id="pd" rows="3" formControlName="description"></textarea>
          @if (msg('description'); as m) { <small class="field-error">{{ m }}</small> }
        </div>
        <div class="field-row three">
          <div class="field">
            <label for="pc">Category</label>
            <input id="pc" type="text" formControlName="category" list="category-list" />
            <datalist id="category-list">
              @for (c of categoryNames(); track c) {
                <option [value]="c"></option>
              }
            </datalist>
            @if (msg('category'); as m) { <small class="field-error">{{ m }}</small> }
          </div>
          <div class="field">
            <label for="pp">Price (₹)</label>
            <input id="pp" type="number" min="1" step="1" formControlName="price" />
            @if (msg('price'); as m) { <small class="field-error">{{ m }}</small> }
          </div>
          <div class="field">
            <label for="pm">MRP (₹)</label>
            <input id="pm" type="number" min="1" step="1" formControlName="mrp" />
            @if (msg('mrp'); as m) { <small class="field-error">{{ m }}</small> }
          </div>
        </div>
        <div class="field-row three">
          <div class="field">
            <label for="ps">Stock</label>
            <input id="ps" type="number" min="0" step="1" formControlName="stock" />
            @if (msg('stock'); as m) { <small class="field-error">{{ m }}</small> }
          </div>
          <div class="field">
            <label for="pr">Rating (0-5)</label>
            <input id="pr" type="number" min="0" max="5" step="0.1" formControlName="rating" />
            @if (msg('rating'); as m) { <small class="field-error">{{ m }}</small> }
          </div>
          <div class="field">
            <label for="pi">Image URL (optional)</label>
            <input id="pi" type="text" formControlName="image" placeholder="https://... or /images/name.svg" />
            @if (msg('image'); as m) { <small class="field-error">{{ m }}</small> }
          </div>
        </div>
        <label class="check"><input type="checkbox" formControlName="featured" /> Show in Featured Products</label>
        <div class="btn-row">
          <button class="btn btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Save product' }}</button>
          <button class="btn btn-outline" type="button" (click)="cancel()">Cancel</button>
        </div>
      </form>
    }

    <form class="filters" (ngSubmit)="applySearch()">
      <input type="search" name="search" [(ngModel)]="searchText" placeholder="Search products..." aria-label="Search products" />
      <button class="btn btn-primary" type="submit">Search</button>
    </form>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (loading()) {
      <div class="spinner" role="status" aria-label="Loading"></div>
    } @else {
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (p of products(); track p.id) {
              <tr>
                <td>
                  <div class="cell-product"><img [src]="p.image" [alt]="p.name" /><span>{{ p.name }} @if (p.featured) { <small class="chip">Featured</small> }</span></div>
                </td>
                <td>{{ p.category }}</td>
                <td>{{ p.price | currency: 'INR' : 'symbol' : '1.0-0' }}</td>
                <td>
                  <div class="stock-edit">
                    <input type="number" min="0" step="1" class="stock-input" [class.low]="p.stock <= 5" [value]="p.stock" (input)="setStockEdit(p.id, $event)" [attr.aria-label]="'Stock for ' + p.name" />
                    <button type="button" class="btn btn-outline btn-sm" (click)="saveStock(p)">Update</button>
                  </div>
                </td>
                <td class="actions">
                  <button type="button" class="btn btn-outline btn-sm" (click)="edit(p)">Edit</button>
                  <button type="button" class="btn btn-outline btn-sm danger-btn" (click)="remove(p)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="center muted">No products found.</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <nav class="pagination">
          <button class="btn btn-outline btn-sm" type="button" [disabled]="page() <= 1" (click)="goTo(page() - 1)">‹ Prev</button>
          <span class="muted">Page {{ page() }} of {{ totalPages() }}</span>
          <button class="btn btn-outline btn-sm" type="button" [disabled]="page() >= totalPages()" (click)="goTo(page() + 1)">Next ›</button>
        </nav>
      }
    }
  `
})
export class AdminProductsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  products = signal<Product[]>([]);
  categoryNames = signal<string[]>([]);
  page = signal(1);
  totalPages = signal(1);
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  formError = signal('');
  searchText = '';
  private search = '';
  private serverErrors = signal<Record<string, string>>({});
  private stockEdits: Record<number, number> = {};

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    category: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    price: [0, [Validators.required, Validators.min(1)]],
    mrp: [0, [Validators.required, Validators.min(1)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    rating: [4, [Validators.required, Validators.min(0), Validators.max(5)]],
    image: [''],
    featured: [false]
  });

  private readonly messages: Record<string, Record<string, string>> = {
    name: { required: 'Name is required', minlength: 'Name is too short' },
    description: { required: 'Description is required', minlength: 'Write at least 10 characters' },
    category: { required: 'Category is required', minlength: 'Category is too short' },
    price: { required: 'Enter a price', min: 'Price must be greater than 0' },
    mrp: { required: 'Enter the MRP', min: 'MRP must be greater than 0' },
    stock: { required: 'Enter the stock', min: 'Stock cannot be negative' },
    rating: { required: 'Enter a rating', min: 'Minimum is 0', max: 'Maximum is 5' }
  };

  ngOnInit(): void {
    this.load();
    this.api.getCategories().subscribe({ next: (c) => this.categoryNames.set(c.map((x) => x.name)), error: () => undefined });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getProducts({ search: this.search, page: this.page(), limit: 10 }).subscribe({
      next: (r) => {
        this.products.set(r.items);
        this.page.set(r.page);
        this.totalPages.set(r.totalPages);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e, 'Could not load products.'));
        this.loading.set(false);
      }
    });
  }

  applySearch(): void {
    this.search = this.searchText.trim();
    this.page.set(1);
    this.load();
  }

  goTo(n: number): void {
    this.page.set(n);
    this.load();
  }

  msg(field: string): string {
    const server = this.serverErrors()[field];
    if (server) return server;
    const control = this.form.get(field);
    if (!control || !control.invalid || !(control.touched || control.dirty)) return '';
    const key = Object.keys(control.errors ?? {})[0];
    return this.messages[field]?.[key] ?? 'Invalid value';
  }

  startNew(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '', category: '', price: 0, mrp: 0, stock: 0, rating: 4, image: '', featured: false });
    this.serverErrors.set({});
    this.formError.set('');
    this.showForm.set(true);
  }

  edit(p: Product): void {
    this.editingId.set(p.id);
    this.form.reset({
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      mrp: p.mrp,
      stock: p.stock,
      rating: p.rating,
      image: p.image,
      featured: p.featured
    });
    this.serverErrors.set({});
    this.formError.set('');
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancel(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  save(): void {
    this.serverErrors.set({});
    this.formError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.mrp < value.price) {
      this.formError.set('MRP cannot be lower than the selling price');
      return;
    }
    this.saving.set(true);
    const id = this.editingId();
    const request = id ? this.api.adminUpdateProduct(id, value) : this.api.adminCreateProduct(value);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(id ? 'Product updated' : 'Product added');
        this.showForm.set(false);
        this.editingId.set(null);
        this.load();
        this.api.getCategories().subscribe({ next: (c) => this.categoryNames.set(c.map((x) => x.name)), error: () => undefined });
      },
      error: (e) => {
        this.saving.set(false);
        this.serverErrors.set(fieldErrors(e));
        this.formError.set(errorMessage(e));
      }
    });
  }

  setStockEdit(id: number, event: Event): void {
    this.stockEdits[id] = Number((event.target as HTMLInputElement).value);
  }

  saveStock(p: Product): void {
    const stock = this.stockEdits[p.id] ?? p.stock;
    if (!Number.isInteger(stock) || stock < 0) {
      this.toast.error('Stock must be a whole number (0 or more)');
      return;
    }
    this.api.adminUpdateStock(p.id, stock).subscribe({
      next: (updated) => {
        this.products.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        delete this.stockEdits[p.id];
        this.toast.success(`Stock for "${p.name}" set to ${updated.stock}`);
      },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  remove(p: Product): void {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    this.api.adminDeleteProduct(p.id).subscribe({
      next: (r) => {
        this.toast.success(r.message);
        this.load();
      },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
