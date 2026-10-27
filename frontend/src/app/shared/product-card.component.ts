import { Component, inject, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../core/models';
import { CartService } from '../core/cart.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, CurrencyPipe, DecimalPipe],
  template: `
    <article class="card product-card">
      <a [routerLink]="['/products', product().id]" class="img-wrap" [attr.aria-label]="'View ' + product().name">
        <img [src]="product().image" [alt]="product().name" loading="lazy" />
        @if (discount() > 0 && product().stock > 0) {
          <span class="badge badge-offer">{{ discount() }}% OFF</span>
        }
        @if (product().stock === 0) {
          <span class="badge badge-out">Out of stock</span>
        }
      </a>
      <div class="card-body">
        <span class="chip">{{ product().category }}</span>
        <h3 class="product-name">{{ product().name }}</h3>
        <div class="rating" [attr.aria-label]="'Rated ' + product().rating + ' out of 5'">
          <span class="star">★</span> {{ product().rating | number: '1.1-1' }}
        </div>
        <div class="price-row">
          <span class="price">{{ product().price | currency: 'INR' : 'symbol' : '1.0-0' }}</span>
          @if (product().mrp > product().price) {
            <span class="mrp">{{ product().mrp | currency: 'INR' : 'symbol' : '1.0-0' }}</span>
          }
        </div>
        <p class="stock" [class.low]="product().stock > 0 && product().stock <= 5" [class.none]="product().stock === 0">
          @if (product().stock === 0) {
            Out of stock
          } @else if (product().stock <= 5) {
            Only {{ product().stock }} left
          } @else {
            In stock
          }
        </p>
        <div class="card-actions">
          <a class="btn btn-outline btn-sm" [routerLink]="['/products', product().id]">View Details</a>
          <button class="btn btn-primary btn-sm" type="button" [disabled]="product().stock === 0" (click)="addToCart()">
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  `
})
export class ProductCardComponent {
  product = input.required<Product>();

  private cart = inject(CartService);
  private toast = inject(ToastService);

  discount(): number {
    const p = this.product();
    return p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  }

  addToCart(): void {
    const p = this.product();
    const problem = this.cart.add(p, 1);
    if (problem) this.toast.error(problem);
    else this.toast.success(`${p.name} added to cart`);
  }
}
