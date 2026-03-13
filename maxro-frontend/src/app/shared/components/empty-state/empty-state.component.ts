import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <mat-icon class="empty-icon" [svgIcon]="svgIcon"></mat-icon>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-message">{{ message }}</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
    }
    .empty-state {
      width: 100%;
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
    }
    .empty-icon {
      width: 48px;
      height: 48px;
      color: rgba(255,255,255,0.12);
      margin-bottom: 16px;
    }
    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px;
    }
    .empty-message {
      font-size: 14px;
      color: var(--text-muted);
      margin: 0;
      max-width: 320px;
    }
  `],
})
export class EmptyStateComponent {
  @Input() svgIcon = 'mx-empty';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
}
