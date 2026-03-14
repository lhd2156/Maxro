import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-macro-bar',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="macro-bar" [attr.data-macro]="label">
      <div class="macro-header">
        <span class="macro-label">{{ label }}</span>
        <span class="macro-values">
          <span class="macro-current">{{ label === 'Calories' ? formatPlainNumber(current) : (current | number:'1.0-0') }}</span>
          <span class="macro-separator">/</span>
          <span class="macro-goal">{{ goal }}{{ unit }}</span>
        </span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" [style.width.%]="percentage" [class.complete]="percentage >= 100" [style.background]="barColor"></div>
      </div>
      <span class="macro-pct" [style.color]="barColor">{{ percentage | number:'1.0-0' }}%</span>
    </div>
  `,
  styles: [`
    .macro-bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .macro-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }
    .macro-label {
      font-size: clamp(12px, 1.6vw, 13px);
      font-weight: 600;
      color: var(--text-primary);
    }
    .macro-values {
      font-size: clamp(12px, 1.7vw, 13px);
      display: inline-flex;
      align-items: baseline;
      min-width: 0;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-variant-numeric: tabular-nums;
    }
    .macro-current {
      color: var(--text-primary);
      font-weight: 600;
    }
    .macro-separator {
      color: var(--text-muted);
      margin: 0 2px;
    }
    .macro-goal {
      color: var(--text-muted);
    }
    .bar-track {
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
      max-width: 100%;
    }
    .macro-pct {
      font-size: 11px;
      color: var(--text-muted);
      align-self: flex-end;
    }
    .macro-pct[style*="color"] { font-weight: 600; }
  `],
})
export class MacroBarComponent {
  @Input() label = '';
  @Input() current = 0;
  @Input() goal = 0;
  @Input() unit = 'g';

  formatPlainNumber(value: number): string {
    return String(Math.round(Number(value || 0)));
  }

  get barColor(): string {
    if (this.percentage >= 100) return 'var(--accent)';
    switch (this.label) {
      case 'Calories': return '#9C27B0';
      case 'Protein': return '#4fc3f7';
      case 'Carbs': return '#C8F135';
      case 'Fat': return '#ff7043';
      default: return 'var(--text-muted)';
    }
  }

  get percentage(): number {
    if (this.goal <= 0) return 0;
    return Math.min((this.current / this.goal) * 100, 100);
  }
}
