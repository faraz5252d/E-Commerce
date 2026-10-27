import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AdminStats } from '../core/models';
import { errorMessage } from '../core/http-error';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CurrencyPipe, RouterLink],
  template: `
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (stats(); as s) {
      <div class="stat-grid">
        <a class="stat card" routerLink="/admin/products"><span class="stat-num">{{ s.products }}</span><span>Products</span></a>
        <a class="stat card warn" routerLink="/admin/products"><span class="stat-num">{{ s.lowStock }}</span><span>Low stock (5 or less)</span></a>
        <a class="stat card danger" routerLink="/admin/products"><span class="stat-num">{{ s.outOfStock }}</span><span>Out of stock</span></a>
        <a class="stat card" routerLink="/admin/orders"><span class="stat-num">{{ s.orders }}</span><span>Total orders</span></a>
        <a class="stat card warn" routerLink="/admin/orders"><span class="stat-num">{{ s.pendingOrders }}</span><span>Orders to process</span></a>
        <a class="stat card" routerLink="/admin/users"><span class="stat-num">{{ s.customers }}</span><span>Customers</span></a>
        <div class="stat card good wide"><span class="stat-num">{{ s.revenue | currency: 'INR' : 'symbol' : '1.0-0' }}</span><span>Revenue (excluding cancelled orders)</span></div>
      </div>
    } @else if (!error()) {
      <div class="spinner" role="status" aria-label="Loading"></div>
    }
  `
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  stats = signal<AdminStats | null>(null);
  error = signal('');

  ngOnInit(): void {
    this.api.adminStats().subscribe({
      next: (s) => this.stats.set(s),
      error: (e) => this.error.set(errorMessage(e, 'Could not load statistics.'))
    });
  }
}
