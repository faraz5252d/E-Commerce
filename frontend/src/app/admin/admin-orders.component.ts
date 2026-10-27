import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { ORDER_STATUSES, Order, OrderStatus } from '../core/models';
import { errorMessage } from '../core/http-error';

@Component({
  selector: 'app-admin-orders',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="section-head">
      <h2>Orders</h2>
      <select [ngModel]="filter()" (ngModelChange)="setFilter($event)" name="status" aria-label="Filter by status">
        <option value="">All statuses</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ s }}</option>
        }
      </select>
    </div>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (loading()) {
      <div class="spinner" role="status" aria-label="Loading"></div>
    } @else if (orders().length === 0 && !error()) {
      <div class="empty"><div class="empty-icon">🧾</div><h3>No orders found</h3></div>
    } @else {
      @for (o of orders(); track o.id) {
        <article class="card order-card">
          <header class="order-head">
            <div>
              <strong>{{ o.orderNumber }}</strong>
              <div class="muted small">{{ o.createdAt | date: 'medium' }} · customer #{{ o.userId }}</div>
            </div>
            <span [class]="'status status-' + o.status.toLowerCase()">{{ o.status }}</span>
            <strong class="order-total">{{ o.total | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
          </header>
          <div class="order-items">
            @for (i of o.items; track i.productId) {
              <div class="order-item">
                <img [src]="i.image" [alt]="i.name" />
                <div>{{ i.name }}<div class="muted small">{{ i.quantity }} × {{ i.price | currency: 'INR' : 'symbol' : '1.0-0' }}</div></div>
                <span>{{ i.subtotal | currency: 'INR' : 'symbol' : '1.0-0' }}</span>
              </div>
            }
          </div>
          <footer class="order-foot">
            <div class="muted small">
              {{ o.shipping.name }} · {{ o.shipping.phone }} · {{ o.shipping.email }}<br />
              {{ o.shipping.address }}, {{ o.shipping.city }}, {{ o.shipping.state }} - {{ o.shipping.pincode }}
            </div>
            @if (o.status === 'Delivered' || o.status === 'Cancelled') {
              <span class="muted small">Final status</span>
            } @else {
              <div class="status-edit">
                <select [ngModel]="o.status" (ngModelChange)="updateStatus(o, $event)" [name]="'st' + o.id" [attr.aria-label]="'Status for ' + o.orderNumber">
                  @for (s of statuses; track s) {
                    <option [value]="s">{{ s }}</option>
                  }
                </select>
              </div>
            }
          </footer>
        </article>
      }
    }
  `
})
export class AdminOrdersComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  statuses = ORDER_STATUSES;
  orders = signal<Order[]>([]);
  filter = signal('');
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.adminOrders(this.filter()).subscribe({
      next: (o) => {
        this.orders.set(o);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e, 'Could not load orders.'));
        this.loading.set(false);
      }
    });
  }

  setFilter(value: string): void {
    this.filter.set(value);
    this.load();
  }

  updateStatus(order: Order, status: OrderStatus): void {
    if (status === order.status) return;
    if (status === 'Cancelled' && !confirm(`Cancel ${order.orderNumber}? Stock will be returned.`)) {
      this.load(); // put the dropdown back
      return;
    }
    this.api.adminUpdateOrderStatus(order.id, status).subscribe({
      next: (updated) => {
        this.toast.success(`${updated.orderNumber} is now ${updated.status}`);
        this.load();
      },
      error: (e) => {
        this.toast.error(errorMessage(e));
        this.load();
      }
    });
  }
}
