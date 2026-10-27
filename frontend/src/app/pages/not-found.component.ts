import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <div class="empty">
        <div class="empty-icon">🧭</div>
        <h1>404 - Page not found</h1>
        <p>The page you are looking for does not exist.</p>
        <a routerLink="/" class="btn btn-primary">Go to Home</a>
      </div>
    </div>
  `
})
export class NotFoundComponent {}
