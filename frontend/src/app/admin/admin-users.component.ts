import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { User } from '../core/models';
import { errorMessage } from '../core/http-error';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe],
  template: `
    <div class="section-head"><h2>Users</h2></div>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (loading()) {
      <div class="spinner" role="status" aria-label="Loading"></div>
    } @else {
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Orders</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td>{{ u.name }}</td>
                <td>{{ u.email }}</td>
                <td>{{ u.phone }}</td>
                <td><span class="chip">{{ u.role }}</span></td>
                <td>{{ u.orderCount }}</td>
                <td>{{ u.createdAt | date: 'mediumDate' }}</td>
                <td><span [class]="u.active ? 'status status-delivered' : 'status status-cancelled'">{{ u.active ? 'Active' : 'Disabled' }}</span></td>
                <td class="actions">
                  @if (u.id === auth.user()?.id) {
                    <span class="muted small">You</span>
                  } @else {
                    <button type="button" class="btn btn-outline btn-sm" (click)="toggleActive(u)">{{ u.active ? 'Disable' : 'Enable' }}</button>
                    <button type="button" class="btn btn-outline btn-sm" (click)="toggleRole(u)">{{ u.role === 'admin' ? 'Make customer' : 'Make admin' }}</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export class AdminUsersComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  users = signal<User[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.adminUsers().subscribe({
      next: (u) => {
        this.users.set(u);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e, 'Could not load users.'));
        this.loading.set(false);
      }
    });
  }

  toggleActive(u: User): void {
    this.api.adminUpdateUser(u.id, { active: !u.active }).subscribe({
      next: () => {
        this.toast.success(`${u.name} ${u.active ? 'disabled' : 'enabled'}`);
        this.load();
      },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  toggleRole(u: User): void {
    const role = u.role === 'admin' ? 'customer' : 'admin';
    if (!confirm(`Change ${u.name}'s role to ${role}?`)) return;
    this.api.adminUpdateUser(u.id, { role }).subscribe({
      next: () => {
        this.toast.success(`${u.name} is now ${role}`);
        this.load();
      },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
