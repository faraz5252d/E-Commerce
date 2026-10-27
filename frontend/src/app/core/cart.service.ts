import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CartItem, CartValidation, MAX_QTY_PER_ITEM, Product } from './models';

const CART_KEY = 'shop_cart';

/**
 * The shopping cart lives in the browser (signals + localStorage).
 * The totals shown here are only a convenience: the server recalculates
 * prices and stock when the order is placed.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);

  readonly items = signal<CartItem[]>(this.load());
  readonly count = computed(() => this.items().reduce((n, i) => n + i.quantity, 0));
  readonly total = computed(() => this.items().reduce((t, i) => t + i.price * i.quantity, 0));

  /** Biggest quantity allowed for one product. */
  maxFor(stock: number): number {
    return Math.max(0, Math.min(stock, MAX_QTY_PER_ITEM));
  }

  quantityOf(productId: number): number {
    return this.items().find((i) => i.productId === productId)?.quantity ?? 0;
  }

  /** Returns a message describing the problem, or null when the item was added. */
  add(product: Product, quantity = 1): string | null {
    if (!Number.isInteger(quantity) || quantity < 1) return 'Please choose a valid quantity';
    if (product.stock <= 0) return 'This product is out of stock';

    const max = this.maxFor(product.stock);
    const existing = this.quantityOf(product.id);
    if (existing + quantity > max) {
      return existing >= max
        ? `You already have the maximum (${max}) of this item in your cart`
        : `You can only add ${max - existing} more of this item`;
    }

    this.items.update((list) => {
      const found = list.find((i) => i.productId === product.id);
      if (found) {
        return list.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + quantity, price: product.price, stock: product.stock } : i
        );
      }
      return [
        ...list,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity,
          stock: product.stock
        }
      ];
    });
    this.save();
    return null;
  }

  setQuantity(productId: number, quantity: number): string | null {
    const item = this.items().find((i) => i.productId === productId);
    if (!item) return null;
    if (!Number.isInteger(quantity) || quantity < 1) return 'Quantity must be at least 1';
    const max = this.maxFor(item.stock);
    if (quantity > max) {
      this.items.update((list) => list.map((i) => (i.productId === productId ? { ...i, quantity: max } : i)));
      this.save();
      return `Only ${max} available for this item`;
    }
    this.items.update((list) => list.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
    this.save();
    return null;
  }

  remove(productId: number): void {
    this.items.update((list) => list.filter((i) => i.productId !== productId));
    this.save();
  }

  clear(): void {
    this.items.set([]);
    this.save();
  }

  /**
   * Asks the backend for the real price and stock of everything in the cart,
   * then updates the cart to match. Returns the server's answer.
   */
  validate(): Observable<CartValidation> {
    const payload = { items: this.items().map((i) => ({ productId: i.productId, quantity: i.quantity })) };
    return this.http.post<CartValidation>('/api/cart/validate', payload).pipe(tap((res) => this.applyValidation(res)));
  }

  private applyValidation(res: CartValidation): void {
    const updated: CartItem[] = [];
    for (const line of res.items) {
      if (line.unavailable || !line.name || line.quantity < 1) continue; // gone or out of stock
      updated.push({
        productId: line.productId,
        name: line.name,
        price: line.price ?? 0,
        image: line.image ?? '',
        quantity: line.quantity,
        stock: line.stock ?? 0
      });
    }
    this.items.set(updated);
    this.save();
  }

  private save(): void {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(this.items()));
    } catch {
      /* storage full/blocked - cart still works for this visit */
    }
  }

  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (i) => i && Number.isInteger(i.productId) && Number.isInteger(i.quantity) && i.quantity > 0 && typeof i.price === 'number'
      );
    } catch {
      return [];
    }
  }
}
