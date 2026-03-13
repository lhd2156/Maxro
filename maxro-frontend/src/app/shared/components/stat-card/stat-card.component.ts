import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="stat-card" [class.accent]="highlight">
      <div class="stat-icon">
        <mat-icon [svgIcon]="svgIcon"></mat-icon>
      </div>
      <div class="stat-content">
        <span class="stat-label">{{ label }}</span>
        <span class="stat-value" [class.accent-text]="highlight">{{ value }}</span>
        @if (subtitle) {
          <span class="stat-subtitle">{{ subtitle }}</span>
        }
      </div>
    </mat-card>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .stat-card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      transition: border-color 0.2s ease;
      height: 100%;
      box-sizing: border-box;
    }
    .stat-card:hover {
      border-color: rgba(255,255,255,0.12);
    }
    .stat-card.accent {
      border-color: rgba(200, 241, 53, 0.3);
    }
    .stat-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255,255,255,0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon mat-icon {
      color: var(--text-muted);
      width: 17px;
      height: 17px;
    }
    .accent .stat-icon {
      background: rgba(200, 241, 53, 0.1);
    }
    .accent .stat-icon mat-icon {
      color: var(--accent);
    }
    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 0;
      min-height: 42px;
    }
    .stat-label {
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }
    .accent-text {
      color: var(--accent);
    }
    .stat-subtitle {
      font-size: 11.5px;
      color: var(--text-muted);
    }
  `],
})
export class StatCardComponent {
  @Input() svgIcon = 'mx-target';
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() subtitle = '';
  @Input() highlight = false;
}

