import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { Order } from '../core/models';
import { errorMessage } from '../core/http-error';

@Component({
  selector: 'app-my-orders',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="container page">
      <h1 class="page-title">My Orders</h1>

      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner" role="status" aria-label="Loading orders"></div>
      } @else if (orders().length === 0 && !error()) {
        <div class="empty">
          <div class="empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>When you place an order, it will show up here.</p>
          <a routerLink="/products" class="btn btn-primary">Start shopping</a>
        </div>
      } @else {
        @for (o of orders(); track o.id) {
          <article class="card order-card">
            <header class="order-head">
              <div>
                <strong>{{ o.orderNumber }}</strong>
                <div class="muted small">Placed on {{ o.createdAt | date: 'medium' }}</div>
              </div>
              <span class="status" [class]="'status status-' + o.status.toLowerCase()">{{ o.status }}</span>
              <strong class="order-total">{{ o.total | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
            </header>

            <div class="order-items">
              @for (i of o.items; track i.productId) {
                <div class="order-item">
                  <img [src]="i.image" [alt]="i.name" />
                  <div>
                    <a [routerLink]="['/products', i.productId]">{{ i.name }}</a>
                    <div class="muted small">{{ i.quantity }} × {{ i.price | currency: 'INR' : 'symbol' : '1.0-0' }}</div>
                  </div>
                  <span>{{ i.subtotal | currency: 'INR' : 'symbol' : '1.0-0' }}</span>
                </div>
              }
            </div>

            <footer class="order-foot">
              <div class="muted small">
                Deliver to: {{ o.shipping.name }}, {{ o.shipping.address }}, {{ o.shipping.city }}, {{ o.shipping.state }} - {{ o.shipping.pincode }} · {{ o.paymentMethod }}
              </div>
              @if (o.status === 'Placed' || o.status === 'Confirmed') {
                <button type="button" class="btn btn-outline btn-sm danger-btn" [disabled]="cancelling() === o.id" (click)="cancel(o)">
                  {{ cancelling() === o.id ? 'Cancelling...' : 'Cancel order' }}
                </button>
              }
            </footer>
          </article>
        }
      }
    </div>
  `
})
export class MyOrdersComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  orders = signal<Order[]>([]);
  loading = signal(true);
  error = signal('');
  cancelling = signal<number | null>(null);

  ngOnInit(): void {
    this.api.getMyOrders().subscribe({
      next: (o) => {
        this.orders.set(o);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e, 'Could not load your orders.'));
        this.loading.set(false);
      }
    });
  }

  cancel(order: Order): void {
    if (!confirm(`Cancel order ${order.orderNumber}?`)) return;
    this.cancelling.set(order.id);
    this.api.cancelOrder(order.id).subscribe({
      next: (updated) => {
        this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
        this.cancelling.set(null);
        this.toast.success(`Order ${updated.orderNumber} cancelled`);
      },
      error: (e) => {
        this.cancelling.set(null);
        this.toast.error(errorMessage(e));
      }
    });
  }
}
