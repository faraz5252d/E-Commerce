import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { errorMessage } from '../core/http-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container page narrow">
      <form class="card form-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1>Welcome back</h1>
        <p class="muted">Log in to place orders and track your deliveries.</p>

        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }

        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" autocomplete="username" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <small class="field-error">Enter a valid email address</small>
          }
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" formControlName="password" autocomplete="current-password" />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <small class="field-error">Enter your password</small>
          }
        </div>

        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Logging in...' : 'Login' }}
        </button>
        <p class="center muted">New here? <a routerLink="/register" class="link">Create an account</a></p>
        <p class="demo-note">
          Demo logins:<br />
          Customer: customer&#64;shop.com / Customer&#64;123<br />
          Admin: admin&#64;shop.com / Admin&#64;123
        </p>
      </form>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  loading = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.toast.success(`Welcome, ${res.user.name.split(' ')[0]}!`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // Only follow in-app paths (blocks redirects to other websites)
        const safe = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : null;
        this.router.navigateByUrl(safe ?? (res.user.role === 'admin' ? '/admin' : '/'));
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(errorMessage(e, 'Login failed. Please try again.'));
      }
    });
  }
}
