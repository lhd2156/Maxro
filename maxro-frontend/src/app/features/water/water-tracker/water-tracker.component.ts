import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { WaterService } from '../../../core/services/water.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfettiService } from '../../../core/services/confetti.service';
import { WaterIntake } from '../../../core/models/water.model';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-water-tracker',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule,
    StatCardComponent, LoadingSpinnerComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Water Intake</h1>
        <div class="date-nav">
          <button mat-icon-button (click)="prevDay()"><mat-icon svgIcon="mx-chevron-left"></mat-icon></button>
          <span class="current-date">{{ currentDate | date:'EEE, MMM d' }}</span>
          <button mat-icon-button (click)="nextDay()"><mat-icon svgIcon="mx-chevron-right"></mat-icon></button>
        </div>
      </div>

      <div class="water-main">
        <mat-card class="water-ring-card">
          <div class="ring-container">
            <svg viewBox="0 0 200 200" class="ring-svg">
              <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12"/>
              <circle cx="100" cy="100" r="85" fill="none" stroke="var(--accent)" stroke-width="12"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="offset"
                stroke-linecap="round" transform="rotate(-90 100 100)"
                class="progress-ring"/>
            </svg>
            <div class="ring-center">
              <span class="ring-amount">{{ water?.totalOz || 0 }}</span>
              <span class="ring-unit">oz</span>
              <span class="ring-goal">of {{ water?.goalOz || user?.dailyWaterGoalOz || 64 }} oz</span>
            </div>
          </div>
          @if (water?.goalMet) {
            <div class="goal-badge">
              <mat-icon svgIcon="mx-check-circle"></mat-icon>
              <span>Daily goal reached!</span>
            </div>
          }
        </mat-card>

        <mat-card class="quick-add-card">
          <h3>Quick Add</h3>
          <div class="quick-buttons">
            @for (amount of quickAmounts; track amount) {
              <button mat-stroked-button class="quick-btn" (click)="addWater(amount)" [disabled]="addingWater">
                <mat-icon svgIcon="mx-droplet"></mat-icon>
                {{ amount }} oz
              </button>
            }
          </div>
        </mat-card>
      </div>

      @if (water && water.entries.length > 0) {
        <mat-card class="log-card">
          <h3>Today's Log</h3>
          <div class="entries">
            @for (entry of water.entries; track entry.loggedAt; let i = $index) {
              <div class="entry-row">
                <div class="entry-num">{{ i + 1 }}</div>
                <span class="entry-amount">{{ entry.amountOz }} oz</span>
                <span class="entry-time">{{ entry.loggedAt | date:'shortTime' }}</span>
              </div>
            }
          </div>
        </mat-card>
      }

      <div class="stats-row">
        <app-stat-card svgIcon="mx-droplet" label="Today"
          [value]="(water?.totalOz || 0) + ' oz'"
          [highlight]="water?.goalMet || false" />
        <app-stat-card svgIcon="mx-glass" label="Glasses"
          [value]="glasses" subtitle="8 oz each" />
        <app-stat-card svgIcon="mx-target" label="Goal"
          [value]="(water?.goalOz || user?.dailyWaterGoalOz || 64) + ' oz'" />
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px;
    }
    h1 { color: var(--text-primary); font-size: 24px; font-weight: 700; margin: 0; }
    .date-nav { display: flex; align-items: center; gap: 8px; }
    .date-nav button { color: var(--text-muted); }
    .current-date { font-size: 15px; font-weight: 600; color: var(--text-primary); min-width: 120px; text-align: center; }
    .water-main {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
    }
    .water-ring-card, .quick-add-card, .log-card {
      background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 24px;
    }
    .ring-container { position: relative; width: 200px; height: 200px; margin: 0 auto; }
    .ring-svg { width: 100%; height: 100%; }
    .progress-ring { transition: stroke-dashoffset 0.6s ease; }
    .ring-center {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .ring-amount { font-size: 36px; font-weight: 800; color: var(--text-primary); }
    .ring-unit { font-size: 14px; color: var(--text-muted); margin-top: -4px; }
    .ring-goal { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .goal-badge {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 16px; padding: 10px; border-radius: 8px;
      background: rgba(200,241,53,0.08); color: var(--accent);
      font-size: 14px; font-weight: 600;
    }
    h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px; }
    .quick-buttons {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
    }
    .quick-btn {
      border-color: rgba(255,255,255,0.1) !important; color: var(--text-primary) !important;
      border-radius: 10px; height: 48px; font-weight: 600;
    }
    .quick-btn:hover {
      border-color: var(--accent) !important; color: var(--accent) !important;
    }
    .log-card { margin-bottom: 16px; }
    .entries { display: flex; flex-direction: column; gap: 6px; }
    .entry-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; background: rgba(255,255,255,0.02); border-radius: 8px;
    }
    .entry-num {
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(200,241,53,0.1); color: var(--accent);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .entry-amount { flex: 1; font-size: 14px; font-weight: 500; color: var(--text-primary); }
    .entry-time { font-size: 13px; color: var(--text-muted); }
    .stats-row {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
    }
    @media (max-width: 768px) {
      .water-main { grid-template-columns: 1fr; }
      .stats-row { grid-template-columns: 1fr; }
    }
  `],
})
export class WaterTrackerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  water: WaterIntake | null = null;
  user: UserProfile | null = null;
  currentDate = new Date();
  addingWater = false;
  quickAmounts = [8, 12, 16, 24];

  readonly circumference = 2 * Math.PI * 85;

  constructor(
    private readonly waterService: WaterService,
    private readonly authService: AuthService,
    private readonly confettiService: ConfettiService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => this.user = user);
    this.loadWater();
  }

  get dateStr(): string {
    const d = this.currentDate;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  get offset(): number {
    if (!this.water) return this.circumference;
    const goal = this.water.goalOz || this.user?.dailyWaterGoalOz || 64;
    const pct = Math.min(this.water.totalOz / goal, 1);
    return this.circumference * (1 - pct);
  }

  get glasses(): number {
    return Math.floor((this.water?.totalOz || 0) / 8);
  }

  prevDay(): void {
    this.currentDate = new Date(this.currentDate.getTime() - 86400000);
    this.loadWater();
  }

  nextDay(): void {
    this.currentDate = new Date(this.currentDate.getTime() + 86400000);
    this.loadWater();
  }

  addWater(amountOz: number): void {
    this.addingWater = true;
    this.waterService.logWater(this.dateStr, amountOz)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: water => {
          const wasGoalMet = this.water?.goalMet || false;
          this.water = water;
          this.addingWater = false;

          if (water.goalMet && !wasGoalMet) {
            this.snackBar.open('Daily water goal reached!', 'Nice!', { duration: 4000 });
            this.confettiService.burst();
          } else {
            this.snackBar.open(`+${amountOz} oz logged`, 'Close', { duration: 2000 });
          }
        },
        error: () => {
          this.addingWater = false;
          this.snackBar.open('Failed to log water', 'Close', { duration: 3000 });
        },
      });
  }

  private loadWater(): void {
    this.waterService.getWaterIntake(this.dateStr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(water => this.water = water);
  }
}
