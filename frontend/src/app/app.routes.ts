import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  { path: '', title: 'ShopEase - Home', loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent) },
  { path: 'products', title: 'Products - ShopEase', loadComponent: () => import('./pages/product-list.component').then((m) => m.ProductListComponent) },
  { path: 'products/:id', title: 'Product Details - ShopEase', loadComponent: () => import('./pages/product-detail.component').then((m) => m.ProductDetailComponent) },
  { path: 'cart', title: 'Your Cart - ShopEase', loadComponent: () => import('./pages/cart.component').then((m) => m.CartComponent) },
  { path: 'checkout', title: 'Checkout - ShopEase', canActivate: [authGuard], loadComponent: () => import('./pages/checkout.component').then((m) => m.CheckoutComponent) },
  { path: 'order-success/:id', title: 'Order Placed - ShopEase', canActivate: [authGuard], loadComponent: () => import('./pages/order-success.component').then((m) => m.OrderSuccessComponent) },
  { path: 'my-orders', title: 'My Orders - ShopEase', canActivate: [authGuard], loadComponent: () => import('./pages/my-orders.component').then((m) => m.MyOrdersComponent) },
  { path: 'profile', title: 'My Profile - ShopEase', canActivate: [authGuard], loadComponent: () => import('./pages/profile.component').then((m) => m.ProfileComponent) },
  { path: 'login', title: 'Login - ShopEase', canActivate: [guestGuard], loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent) },
  { path: 'register', title: 'Register - ShopEase', canActivate: [guestGuard], loadComponent: () => import('./pages/register.component').then((m) => m.RegisterComponent) },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', title: 'Admin Dashboard', loadComponent: () => import('./admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent) },
      { path: 'products', title: 'Manage Products', loadComponent: () => import('./admin/admin-products.component').then((m) => m.AdminProductsComponent) },
      { path: 'orders', title: 'Manage Orders', loadComponent: () => import('./admin/admin-orders.component').then((m) => m.AdminOrdersComponent) },
      { path: 'users', title: 'Manage Users', loadComponent: () => import('./admin/admin-users.component').then((m) => m.AdminUsersComponent) }
    ]
  },
  { path: '**', title: 'Page not found', loadComponent: () => import('./pages/not-found.component').then((m) => m.NotFoundComponent) }
];
