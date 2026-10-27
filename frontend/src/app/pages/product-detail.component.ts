import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CartService } from '../core/cart.service';
import { ToastService } from '../core/toast.service';
import { Product } from '../core/models';
import { errorMessage } from '../core/http-error';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, CurrencyPipe, DecimalPipe],
  template: `
    <div class="container page">
      <a routerLink="/products" class="back-link">← Back to products</a>

      @if (loading()) {
        <div class="spinner" role="status" aria-label="Loading product"></div>
      } @else if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      } @else if (product(); as p) {
        <div class="detail">
          <div class="detail-image">
            <img [src]="p.image" [alt]="p.name" />
          </div>
          <div class="detail-info">
            <span class="chip">{{ p.category }}</span>
            <h1>{{ p.name }}</h1>
            <div class="rating"><span class="star">★</span> {{ p.rating | number: '1.1-1' }} / 5</div>
            <div class="price-row big">
              <span class="price">{{ p.price | currency: 'INR' : 'symbol' : '1.0-0' }}</span>
              @if (p.mrp > p.price) {
                <span class="mrp">{{ p.mrp | currency: 'INR' : 'symbol' : '1.0-0' }}</span>
                <span class="badge-inline">{{ discount(p) }}% OFF</span>
              }
            </div>
            <p class="description">{{ p.description }}</p>

            <p class="stock" [class.low]="p.stock > 0 && p.stock <= 5" [class.none]="p.stock === 0">
              @if (p.stock === 0) {
                Out of stock
              } @else {
                {{ p.stock }} available
              }
            </p>

            @if (p.stock > 0) {
              <div class="qty-row">
                <label for="qty">Quantity</label>
                <div class="qty-control">
                  <button type="button" class="btn btn-outline btn-sm" [disabled]="quantity() <= 1" (click)="change(-1)" aria-label="Decrease quantity">−</button>
                  <input id="qty" type="number" min="1" [attr.max]="maxQty(p)" [value]="quantity()" (change)="typed($event)" />
                  <button type="button" class="btn btn-outline btn-sm" [disabled]="quantity() >= maxQty(p)" (click)="change(1)" aria-label="Increase quantity">+</button>
                </div>
                <small class="hint">Max {{ maxQty(p) }} per order</small>
              </div>
              <div class="detail-actions">
                <button type="button" class="btn btn-primary btn-lg" (click)="add(p, false)">Add to Cart</button>
                <button type="button" class="btn btn-accent btn-lg" (click)="add(p, true)">Buy Now</button>
              </div>
            } @else {
              <button type="button" class="btn btn-lg" disabled>Out of stock</button>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class ProductDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cart = inject(CartService);
  private toast = inject(ToastService);

  product = signal<Product | null>(null);
  quantity = signal(1);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.loading.set(true);
      this.error.set('');
      this.quantity.set(1);
      if (!Number.isInteger(id) || id < 1) {
        this.error.set('Product not found.');
        this.loading.set(false);
        return;
      }
      this.api.getProduct(id).subscribe({
        next: (p) => {
          this.product.set(p);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e, 'Could not load this product.'));
          this.loading.set(false);
        }
      });
    });
  }

  discount(p: Product): number {
    return Math.round(((p.mrp - p.price) / p.mrp) * 100);
  }

  maxQty(p: Product): number {
    return this.cart.maxFor(p.stock);
  }

  change(delta: number): void {
    const p = this.product();
    if (p) this.quantity.set(this.clamp(this.quantity() + delta, p));
  }

  typed(event: Event): void {
    const p = this.product();
    if (!p) return;
    const input = event.target as HTMLInputElement;
    const value = Math.floor(Number(input.value));
    const next = this.clamp(Number.isFinite(value) ? value : 1, p);
    this.quantity.set(next);
    input.value = String(next); // snap the box back if the typed number was too big or too small
    if (value > next) this.toast.error(`Only ${next} can be ordered at a time`);
  }

  add(p: Product, buyNow: boolean): void {
    const problem = this.cart.add(p, this.quantity());
    if (problem) {
      this.toast.error(problem);
      return;
    }
    this.toast.success(`${this.quantity()} × ${p.name} added to cart`);
    if (buyNow) this.router.navigate(['/cart']);
  }

  private clamp(n: number, p: Product): number {
    return Math.min(Math.max(n, 1), this.maxQty(p));
  }
}
