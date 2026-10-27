import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Adds the login token to every API call, and logs the user out if the token has expired. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const request = token && req.url.startsWith('/api') ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      const isAuthCall = req.url.startsWith('/api/auth/login') || req.url.startsWith('/api/auth/register');
      if (err instanceof HttpErrorResponse && err.status === 401 && token && !isAuthCall) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
