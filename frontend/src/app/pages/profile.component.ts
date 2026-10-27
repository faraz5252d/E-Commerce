import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { errorMessage, fieldErrors } from '../core/http-error';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="container page narrow">
      <h1 class="page-title">My Profile</h1>

      <form class="card form-card" [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
        <h3>Personal details</h3>
        <p class="muted small">
          {{ auth.user()?.email }} · {{ auth.user()?.role }} · member since {{ auth.user()?.createdAt | date: 'mediumDate' }}
        </p>
        <div class="field">
          <label for="pname">Full name</label>
          <input id="pname" type="text" formControlName="name" />
          @if (profileForm.controls.name.touched && profileForm.controls.name.invalid) {
            <small class="field-error">Enter your name (at least 2 characters)</small>
          }
        </div>
        <div class="field">
          <label for="pphone">Mobile number</label>
          <input id="pphone" type="tel" formControlName="phone" maxlength="10" inputmode="numeric" />
          @if (profileForm.controls.phone.touched && profileForm.controls.phone.invalid) {
            <small class="field-error">Enter a valid 10-digit Indian mobile number</small>
          }
        </div>
        <button class="btn btn-primary" type="submit" [disabled]="savingProfile()">{{ savingProfile() ? 'Saving...' : 'Save changes' }}</button>
      </form>

      <form class="card form-card" [formGroup]="passwordForm" (ngSubmit)="savePassword()" novalidate>
        <h3>Change password</h3>
        @if (passwordError()) {
          <div class="alert alert-error">{{ passwordError() }}</div>
        }
        <div class="field">
          <label for="current">Current password</label>
          <input id="current" type="password" formControlName="current" autocomplete="current-password" />
        </div>
        <div class="field">
          <label for="newpw">New password</label>
          <input id="newpw" type="password" formControlName="newPassword" autocomplete="new-password" />
          <small class="hint">At least 8 characters with a letter and a number.</small>
          @if (passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.invalid) {
            <small class="field-error">Password is too weak</small>
          }
        </div>
        <button class="btn btn-primary" type="submit" [disabled]="savingPassword()">{{ savingPassword() ? 'Updating...' : 'Update password' }}</button>
      </form>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  savingProfile = signal(false);
  savingPassword = signal(false);
  passwordError = signal('');

  profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]]
  });

  passwordForm = this.fb.nonNullable.group({
    current: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]]
  });

  ngOnInit(): void {
    const u = this.auth.user();
    if (u) this.profileForm.patchValue({ name: u.name, phone: u.phone });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    const { name, phone } = this.profileForm.getRawValue();
    this.auth.updateProfile({ name: name.trim(), phone: phone.trim() }).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.toast.success('Profile updated');
      },
      error: (e) => {
        this.savingProfile.set(false);
        this.toast.error(Object.values(fieldErrors(e))[0] ?? errorMessage(e));
      }
    });
  }

  savePassword(): void {
    this.passwordError.set('');
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    const { current, newPassword } = this.passwordForm.getRawValue();
    this.auth.changePassword(current, newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.toast.success('Password updated');
      },
      error: (e) => {
        this.savingPassword.set(false);
        this.passwordError.set(errorMessage(e));
      }
    });
  }
}
