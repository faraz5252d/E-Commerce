import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, User } from './models';

const TOKEN_KEY = 'shop_token';
const USER_KEY = 'shop_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<User | null>(this.readStoredUser());
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  get token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  register(data: { name: string; email: string; phone: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', data).pipe(tap((res) => this.saveSession(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(tap((res) => this.saveSession(res)));
  }

  logout(redirect = true): void {
    this.user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable - ignore */
    }
    if (redirect) this.router.navigate(['/login']);
  }

  /** Re-checks the saved token with the server when the app starts. */
  refreshProfile(): void {
    if (!this.token) return;
    this.http.get<User>('/api/auth/me').subscribe({
      next: (user) => this.setUser(user),
      error: () => {
        /* the interceptor logs out on 401 */
      }
    });
  }

  updateProfile(data: { name: string; phone: string }): Observable<User> {
    return this.http.put<User>('/api/auth/profile', data).pipe(tap((user) => this.setUser(user)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>('/api/auth/password', { currentPassword, newPassword });
  }

  private saveSession(res: AuthResponse): void {
    try {
      localStorage.setItem(TOKEN_KEY, res.token);
    } catch {
      /* ignore */
    }
    this.setUser(res.user);
  }

  private setUser(user: User): void {
    this.user.set(user);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }

  private readStoredUser(): User | null {
    try {
      if (!localStorage.getItem(TOKEN_KEY)) return null;
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
