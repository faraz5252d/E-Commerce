import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="container page admin">
      <h1 class="page-title">Admin Panel</h1>
      <nav class="admin-tabs">
        <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">📊 Dashboard</a>
        <a routerLink="/admin/products" routerLinkActive="active">📦 Products &amp; Inventory</a>
        <a routerLink="/admin/orders" routerLinkActive="active">🧾 Orders</a>
        <a routerLink="/admin/users" routerLinkActive="active">👥 Users</a>
      </nav>
      <router-outlet />
    </div>
  `
})
export class AdminLayoutComponent {}
