import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (t of toastService.toasts(); track t.id) {
        <div class="toast" [class.toast-success]="t.type === 'success'" [class.toast-error]="t.type === 'error'">
          <span>{{ t.text }}</span>
          <button type="button" class="toast-close" aria-label="Dismiss" (click)="toastService.dismiss(t.id)">×</button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}
