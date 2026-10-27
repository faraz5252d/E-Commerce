import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { ToastService } from '../core/toast.service';
import { errorMessage, fieldErrors } from '../core/http-error';
import { Shipping } from '../core/models';
import { HttpErrorResponse } from '@angular/common/http';

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const PIN_PATTERN = /^[1-9]\d{5}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="container page">
      <h1 class="page-title">Checkout</h1>

      @if (issues().length > 0) {
        <div class="alert alert-warn">
          <strong>Your cart was updated:</strong>
          <ul>
            @for (i of issues(); track i) {
              <li>{{ i }}</li>
            }
          </ul>
          <a routerLink="/cart" class="link">Review cart</a>
        </div>
      }
      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      @if (checking()) {
        <div class="spinner" role="status" aria-label="Checking your cart"></div>
      } @else {
        <div class="cart-layout">
          <form class="card form-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <h3>Delivery Details</h3>

            <div class="field">
              <label for="name">Full name</label>
              <input id="name" type="text" formControlName="name" autocomplete="name" />
              @if (msg('name'); as m) { <small class="field-error">{{ m }}</small> }
            </div>

            <div class="field-row">
              <div class="field">
                <label for="email">Email address</label>
                <input id="email" type="email" formControlName="email" autocomplete="email" />
                @if (msg('email'); as m) { <small class="field-error">{{ m }}</small> }
              </div>
              <div class="field">
                <label for="phone">Mobile number</label>
                <input id="phone" type="tel" formControlName="phone" maxlength="10" inputmode="numeric" placeholder="10-digit number" autocomplete="tel-national" />
                @if (msg('phone'); as m) { <small class="field-error">{{ m }}</small> }
              </div>
            </div>

            <div class="field">
              <label for="address">Shipping address</label>
              <textarea id="address" rows="3" formControlName="address" autocomplete="street-address" placeholder="House no., street, area"></textarea>
              @if (msg('address'); as m) { <small class="field-error">{{ m }}</small> }
            </div>

            <div class="field-row three">
              <div class="field">
                <label for="city">City</label>
                <input id="city" type="text" formControlName="city" autocomplete="address-level2" />
                @if (msg('city'); as m) { <small class="field-error">{{ m }}</small> }
              </div>
              <div class="field">
                <label for="state">State</label>
                <input id="state" type="text" formControlName="state" autocomplete="address-level1" />
                @if (msg('state'); as m) { <small class="field-error">{{ m }}</small> }
              </div>
              <div class="field">
                <label for="pincode">PIN code</label>
                <input id="pincode" type="text" formControlName="pincode" maxlength="6" inputmode="numeric" autocomplete="postal-code" />
                @if (msg('pincode'); as m) { <small class="field-error">{{ m }}</small> }
              </div>
            </div>

            <h3>Payment Method</h3>
            <label class="radio-card">
              <input type="radio" checked disabled />
              <span><strong>Cash on Delivery</strong><br /><small class="muted">Pay in cash when your order arrives.</small></span>
            </label>

            <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="submitting() || cart.items().length === 0">
              {{ submitting() ? 'Placing order...' : 'Place Order' }}
            </button>
          </form>

          <aside class="summary card">
            <h3>Order Summary</h3>
            @for (item of cart.items(); track item.productId) {
              <div class="summary-item">
                <img [src]="item.image" [alt]="item.name" />
                <div>
                  <div class="cart-name">{{ item.name }}</div>
                  <small class="muted">{{ item.quantity }} × {{ item.price | currency: 'INR' : 'symbol' : '1.0-0' }}</small>
                </div>
                <strong>{{ item.price * item.quantity | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
              </div>
            }
            <div class="summary-line"><span>Delivery</span><span class="free">FREE</span></div>
            <div class="summary-line total"><span>Total to pay</span><span>{{ cart.total() | currency: 'INR' : 'symbol' : '1.0-0' }}</span></div>
          </aside>
        </div>
      }
    </div>
  `
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  cart = inject(CartService);

  checking = signal(true);
  submitting = signal(false);
  error = signal('');
  issues = signal<string[]>([]);
  private serverErrors = signal<Record<string, string>>({});

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    pincode: ['', [Validators.required, Validators.pattern(PIN_PATTERN)]]
  });

  private readonly messages: Record<string, Record<string, string>> = {
    name: { required: 'Please enter your name', minlength: 'Name is too short' },
    email: { required: 'Please enter your email', pattern: 'Enter a valid email address' },
    phone: { required: 'Please enter your mobile number', pattern: 'Enter a valid 10-digit Indian mobile number (starts with 6-9)' },
    address: { required: 'Please enter your address', minlength: 'Address is too short' },
    city: { required: 'Please enter your city', minlength: 'City is too short' },
    state: { required: 'Please enter your state', minlength: 'State is too short' },
    pincode: { required: 'Please enter your PIN code', pattern: 'Enter a valid 6-digit PIN code' }
  };

  ngOnInit(): void {
    const user = this.auth.user();
    if (user) this.form.patchValue({ name: user.name, email: user.email, phone: user.phone });

    if (this.cart.items().length === 0) {
      this.router.navigate(['/cart']);
      return;
    }
    // Re-check prices and stock with the server before the customer pays
    this.cart.validate().subscribe({
      next: (res) => {
        this.issues.set(res.issues);
        this.checking.set(false);
        if (this.cart.items().length === 0) this.router.navigate(['/cart']);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.checking.set(false);
      }
    });
  }

  /** Error text for one field (only after the user touched it, or the server rejected it). */
  msg(field: string): string {
    const server = this.serverErrors()[field];
    if (server) return server;
    const control = this.form.get(field);
    if (!control || !control.invalid || !(control.touched || control.dirty)) return '';
    const key = Object.keys(control.errors ?? {})[0];
    return this.messages[field]?.[key] ?? 'Invalid value';
  }

  submit(): void {
    this.error.set('');
    this.serverErrors.set({});
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please fix the highlighted fields');
      return;
    }
    if (this.cart.items().length === 0) {
      this.router.navigate(['/cart']);
      return;
    }

    this.submitting.set(true);
    const items = this.cart.items().map((i) => ({ productId: i.productId, quantity: i.quantity }));
    const raw = this.form.getRawValue();
    const shipping: Shipping = {
      name: raw.name.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim(),
      address: raw.address.trim(),
      city: raw.city.trim(),
      state: raw.state.trim(),
      pincode: raw.pincode.trim()
    };

    this.api.placeOrder(items, shipping).subscribe({
      next: (order) => {
        this.cart.clear();
        this.submitting.set(false);
        this.router.navigate(['/order-success', order.id]);
      },
      error: (e: unknown) => {
        this.submitting.set(false);
        this.serverErrors.set(fieldErrors(e));
        this.error.set(errorMessage(e));
        if (e instanceof HttpErrorResponse && e.status === 409) {
          // Prices or stock changed: sync the cart with the server and show what changed
          this.issues.set((e.error?.issues as string[]) ?? []);
          this.cart.validate().subscribe({ error: () => undefined });
        }
      }
    });
  }
}
