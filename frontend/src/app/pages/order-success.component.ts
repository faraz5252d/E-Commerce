import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Order } from '../core/models';
import { errorMessage } from '../core/http-error';

@Component({
  selector: 'app-order-success',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="container page narrow">
      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      } @else if (order(); as o) {
        <div class="card success-card">
          <div class="success-icon">✅</div>
          <h1>Thank you! Your order is placed.</h1>
          <p>Order number <strong>{{ o.orderNumber }}</strong> · {{ o.createdAt | date: 'medium' }}</p>
          <p class="muted">Pay <strong>{{ o.total | currency: 'INR' : 'symbol' : '1.0-0' }}</strong> in cash when it is delivered.</p>

          <div class="order-block">
            <h3>Items</h3>
            @for (i of o.items; track i.productId) {
              <div class="summary-line"><span>{{ i.name }} × {{ i.quantity }}</span><span>{{ i.subtotal | currency: 'INR' : 'symbol' : '1.0-0' }}</span></div>
            }
            <div class="summary-line total"><span>Total</span><span>{{ o.total | currency: 'INR' : 'symbol' : '1.0-0' }}</span></div>
          </div>
          <div class="order-block">
            <h3>Delivering to</h3>
            <p>{{ o.shipping.name }}<br />{{ o.shipping.address }}<br />{{ o.shipping.city }}, {{ o.shipping.state }} - {{ o.shipping.pincode }}<br />📞 {{ o.shipping.phone }}</p>
          </div>

          <div class="btn-row">
            <a routerLink="/my-orders" class="btn btn-primary">View my orders</a>
            <a routerLink="/products" class="btn btn-outline">Continue shopping</a>
          </div>
        </div>
      } @else {
        <div class="spinner" role="status" aria-label="Loading order"></div>
      }
    </div>
  `
})
export class OrderSuccessComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  order = signal<Order | null>(null);
  error = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getOrder(id).subscribe({
      next: (o) => this.order.set(o),
      error: (e) => this.error.set(errorMessage(e, 'Could not load this order.'))
    });
  }
}
