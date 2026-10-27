import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { errorMessage, fieldErrors } from '../core/http-error';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container page narrow">
      <form class="card form-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1>Create your account</h1>
        <p class="muted">It takes less than a minute.</p>

        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }

        <div class="field">
          <label for="name">Full name</label>
          <input id="name" type="text" formControlName="name" autocomplete="name" />
          @if (msg('name'); as m) { <small class="field-error">{{ m }}</small> }
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" autocomplete="email" />
          @if (msg('email'); as m) { <small class="field-error">{{ m }}</small> }
        </div>
        <div class="field">
          <label for="phone">Mobile number</label>
          <input id="phone" type="tel" formControlName="phone" maxlength="10" inputmode="numeric" placeholder="10-digit number" />
          @if (msg('phone'); as m) { <small class="field-error">{{ m }}</small> }
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" formControlName="password" autocomplete="new-password" />
          <small class="hint">At least 8 characters with a letter and a number.</small>
          @if (msg('password'); as m) { <small class="field-error">{{ m }}</small> }
        </div>
        <div class="field">
          <label for="confirm">Confirm password</label>
          <input id="confirm" type="password" formControlName="confirm" autocomplete="new-password" />
          @if (form.controls.confirm.touched && form.hasError('mismatch')) {
            <small class="field-error">Passwords do not match</small>
          }
        </div>

        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Creating account...' : 'Register' }}
        </button>
        <p class="center muted">Already have an account? <a routerLink="/login" class="link">Login</a></p>
      </form>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = signal(false);
  error = signal('');
  private serverErrors = signal<Record<string, string>>({});

  form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)]],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
      confirm: ['', [Validators.required]]
    },
    { validators: passwordsMatch }
  );

  private readonly messages: Record<string, Record<string, string>> = {
    name: { required: 'Please enter your name', minlength: 'Name is too short' },
    email: { required: 'Please enter your email', pattern: 'Enter a valid email address' },
    phone: { required: 'Please enter your mobile number', pattern: 'Enter a valid 10-digit Indian mobile number (starts with 6-9)' },
    password: { required: 'Please choose a password', minlength: 'Use at least 8 characters', pattern: 'Include at least one letter and one number' }
  };

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
      return;
    }
    this.loading.set(true);
    const { name, email, phone, password } = this.form.getRawValue();
    this.auth.register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.toast.success(`Account created. Welcome, ${res.user.name.split(' ')[0]}!`);
        this.router.navigate(['/']);
      },
      error: (e) => {
        this.loading.set(false);
        this.serverErrors.set(fieldErrors(e));
        this.error.set(errorMessage(e, 'Registration failed. Please try again.'));
      }
    });
  }
}
