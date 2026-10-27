import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <header class="navbar">
      <div class="container nav-inner">
        <a routerLink="/" class="brand" (click)="menuOpen.set(false)">
          <span class="brand-logo">🛍️</span>
          <span class="brand-name">ShopEase</span>
        </a>

        <button class="nav-toggle" type="button" aria-label="Toggle menu" [attr.aria-expanded]="menuOpen()" (click)="menuOpen.set(!menuOpen())">
          ☰
        </button>

        <nav class="nav-links" [class.open]="menuOpen()" (click)="menuOpen.set(false)">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
          <a routerLink="/products" routerLinkActive="active">Products</a>
          <a routerLink="/" fragment="categories">Categories</a>
          @if (auth.isLoggedIn()) {
            <a routerLink="/my-orders" routerLinkActive="active">My Orders</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active">Admin</a>
          }
          <a routerLink="/cart" routerLinkActive="active" class="cart-link">
            🛒 Cart
            @if (cart.count() > 0) {
              <span class="cart-badge">{{ cart.count() }}</span>
            }
          </a>
          @if (auth.isLoggedIn()) {
            <a routerLink="/profile" routerLinkActive="active">👤 {{ firstName() }}</a>
            <button type="button" class="btn btn-outline btn-sm" (click)="logout()">Logout</button>
          } @else {
            <a routerLink="/login" routerLinkActive="active">Login</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Register</a>
          }
        </nav>
      </div>
    </header>
  `
})
export class NavbarComponent {
  auth = inject(AuthService);
  cart = inject(CartService);
  private router = inject(Router);

  menuOpen = signal(false);

  firstName(): string {
    return (this.auth.user()?.name ?? '').split(' ')[0];
  }

  logout(): void {
    this.auth.logout(false);
    this.router.navigate(['/']);
  }
}
