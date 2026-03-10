import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner-container">
      <mat-spinner diameter="40" color="accent"></mat-spinner>
    </div>
  `,
  styles: [`
    .spinner-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
    }
    ::ng-deep .mat-mdc-progress-spinner circle {
      stroke: var(--accent) !important;
    }
  `],
})
export class LoadingSpinnerComponent {}
