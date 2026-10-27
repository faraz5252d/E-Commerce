import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { ToastService } from '../core/toast.service';
import { errorMessage } from '../core/http-error';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div class="container page">
      <h1 class="page-title">Shopping Cart</h1>

      @if (issues().length > 0) {
        <div class="alert alert-warn">
          <strong>We updated your cart:</strong>
          <ul>
            @for (i of issues(); track i) {
              <li>{{ i }}</li>
            }
          </ul>
        </div>
      }
      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      @if (cart.items().length === 0) {
        <div class="empty">
          <div class="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything yet.</p>
          <a routerLink="/products" class="btn btn-primary">Start shopping</a>
        </div>
      } @else {
        <div class="cart-layout">
          <div class="cart-items">
            @for (item of cart.items(); track item.productId) {
              <div class="cart-row">
                <a [routerLink]="['/products', item.productId]"><img [src]="item.image" [alt]="item.name" class="cart-img" /></a>
                <div class="cart-info">
                  <a [routerLink]="['/products', item.productId]" class="cart-name">{{ item.name }}</a>
                  <div class="muted">Unit price: {{ item.price | currency: 'INR' : 'symbol' : '1.0-0' }}</div>
                  <button type="button" class="link danger" (click)="remove(item.productId, item.name)">Remove</button>
                </div>
                <div class="qty-control">
                  <button type="button" class="btn btn-outline btn-sm" [disabled]="item.quantity <= 1" (click)="setQty(item.productId, item.quantity - 1)" aria-label="Decrease quantity">−</button>
                  <span class="qty-value">{{ item.quantity }}</span>
                  <button type="button" class="btn btn-outline btn-sm" [disabled]="item.quantity >= cart.maxFor(item.stock)" (click)="setQty(item.productId, item.quantity + 1)" aria-label="Increase quantity">+</button>
                </div>
                <div class="cart-subtotal">{{ item.price * item.quantity | currency: 'INR' : 'symbol' : '1.0-0' }}</div>
              </div>
            }
            <button type="button" class="btn btn-outline" (click)="clear()">Clear cart</button>
          </div>

          <aside class="summary card">
            <h3>Order Summary</h3>
            <div class="summary-line"><span>Items ({{ cart.count() }})</span><span>{{ cart.total() | currency: 'INR' : 'symbol' : '1.0-0' }}</span></div>
            <div class="summary-line"><span>Delivery</span><span class="free">FREE</span></div>
            <div class="summary-line total"><span>Total</span><span>{{ cart.total() | currency: 'INR' : 'symbol' : '1.0-0' }}</span></div>
            <p class="muted small">Final prices are confirmed by our server when you place the order. Payment: Cash on Delivery.</p>
            <button type="button" class="btn btn-primary btn-block" [disabled]="checking()" (click)="checkout()">
              {{ checking() ? 'Checking availability...' : 'Proceed to Checkout' }}
            </button>
            <a routerLink="/products" class="btn btn-outline btn-block">Continue shopping</a>
          </aside>
        </div>
      }
    </div>
  `
})
export class CartComponent implements OnInit {
  cart = inject(CartService);
  private router = inject(Router);
  private toast = inject(ToastService);

  issues = signal<string[]>([]);
  error = signal('');
  checking = signal(false);

  ngOnInit(): void {
    // Refresh prices/stock from the server as soon as the cart opens
    if (this.cart.items().length > 0) {
      this.cart.validate().subscribe({
        next: (res) => this.issues.set(res.issues),
        error: () => undefined // offline? the cart still shows what we have
      });
    }
  }

  setQty(productId: number, quantity: number): void {
    const problem = this.cart.setQuantity(productId, quantity);
    if (problem) this.toast.error(problem);
  }

  remove(productId: number, name: string): void {
    this.cart.remove(productId);
    this.toast.show(`${name} removed`);
  }

  clear(): void {
    if (confirm('Remove all items from your cart?')) this.cart.clear();
  }

  checkout(): void {
    this.checking.set(true);
    this.error.set('');
    this.cart.validate().subscribe({
      next: (res) => {
        this.checking.set(false);
        this.issues.set(res.issues);
        if (this.cart.items().length === 0) return;
        if (res.valid) {
          this.router.navigate(['/checkout']);
        } else {
          this.toast.error('Please review the changes to your cart, then continue.');
        }
      },
      error: (e) => {
        this.checking.set(false);
        this.error.set(errorMessage(e));
      }
    });
  }
}
