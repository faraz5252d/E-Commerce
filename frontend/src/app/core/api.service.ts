import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminStats, Category, Order, OrderStatus, Product, ProductPage, Shipping, User } from './models';

export interface ProductQuery {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
  offers?: boolean;
}

/** All REST calls to the Express backend live here. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ----- Products (public) -----
  getProducts(q: ProductQuery = {}): Observable<ProductPage> {
    let params = new HttpParams();
    if (q.search) params = params.set('search', q.search);
    if (q.category && q.category !== 'All') params = params.set('category', q.category);
    if (q.sort) params = params.set('sort', q.sort);
    if (q.page) params = params.set('page', q.page);
    if (q.limit) params = params.set('limit', q.limit);
    if (q.featured) params = params.set('featured', 'true');
    if (q.offers) params = params.set('offers', 'true');
    return this.http.get<ProductPage>('/api/products', { params });
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`/api/products/${id}`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/products/categories');
  }

  // ----- Orders (customer) -----
  placeOrder(items: { productId: number; quantity: number }[], shipping: Shipping): Observable<Order> {
    return this.http.post<Order>('/api/orders', { items, shipping, paymentMethod: 'COD' });
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>('/api/orders/mine');
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`/api/orders/${id}`);
  }

  cancelOrder(id: number): Observable<Order> {
    return this.http.post<Order>(`/api/orders/${id}/cancel`, {});
  }

  // ----- Admin -----
  adminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>('/api/admin/stats');
  }

  adminCreateProduct(p: Partial<Product>): Observable<Product> {
    return this.http.post<Product>('/api/admin/products', p);
  }

  adminUpdateProduct(id: number, p: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`/api/admin/products/${id}`, p);
  }

  adminUpdateStock(id: number, stock: number): Observable<Product> {
    return this.http.patch<Product>(`/api/admin/products/${id}/stock`, { stock });
  }

  adminDeleteProduct(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/admin/products/${id}`);
  }

  adminUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/admin/users');
  }

  adminUpdateUser(id: number, changes: { role?: string; active?: boolean }): Observable<User> {
    return this.http.patch<User>(`/api/admin/users/${id}`, changes);
  }

  adminOrders(status?: string): Observable<Order[]> {
    const params = status ? new HttpParams().set('status', status) : new HttpParams();
    return this.http.get<Order[]>('/api/admin/orders', { params });
  }

  adminUpdateOrderStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`/api/admin/orders/${id}/status`, { status });
  }
}
