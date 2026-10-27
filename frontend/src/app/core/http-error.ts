import { HttpErrorResponse } from '@angular/common/http';

/** Turns any HTTP failure into a friendly message the user can read. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Is the backend running on port 3000?';
    const body = err.error;
    if (body && typeof body === 'object' && typeof body.message === 'string') return body.message;
  }
  return fallback;
}

/** Field-level errors from the backend ({ errors: { email: '...' } }). */
export function fieldErrors(err: unknown): Record<string, string> {
  if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && err.error.errors) {
    return err.error.errors as Record<string, string>;
  }
  return {};
}
