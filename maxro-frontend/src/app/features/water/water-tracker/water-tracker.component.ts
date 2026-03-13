import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule,
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
          <div class="quick-add-body">
            <div class="quick-controls-grid">
              @for (amount of quickAmounts; track amount) {
                <button
                  mat-stroked-button
                  class="quick-btn"
                  (click)="applyQuickAmount(amount)"
                  [disabled]="addingWater || (quickAdjustMode === 'remove' && (water?.totalOz || 0) <= 0)">
                  {{ amount }} oz
                </button>
              }
              <button
                type="button"
                class="quick-mode-btn quick-mode-minus"
                [class.active]="quickAdjustMode === 'remove'"
                (click)="setQuickAdjustMode('remove')"
                aria-label="Switch to remove mode">
                <mat-icon svgIcon="mx-minus"></mat-icon>
              </button>
              <button
                type="button"
                class="quick-mode-btn quick-mode-plus"
                [class.active]="quickAdjustMode === 'add'"
                (click)="setQuickAdjustMode('add')"
                aria-label="Switch to add mode">
                <mat-icon svgIcon="mx-plus"></mat-icon>
              </button>
            </div>

            <div class="quick-custom-wrap">
              <button
                type="button"
                class="quick-custom-btn"
                [class.active]="showCustomInput"
                (click)="toggleCustomInput()">
                Custom
              </button>

              <div class="quick-custom-panel" [class.open]="showCustomInput">
                <div class="quick-custom-entry">
                  <input
                    type="text"
                    class="quick-custom-input"
                    inputmode="decimal"
                    maxlength="5"
                    placeholder="Enter oz"
                    [(ngModel)]="customAmountInput"
                    (keydown.enter)="applyCustomAmount()" />
                  <button
                    mat-stroked-button
                    class="quick-custom-apply"
                    (click)="applyCustomAmount()"
                    [disabled]="addingWater || !hasCustomAmount || (quickAdjustMode === 'remove' && (water?.totalOz || 0) <= 0)">
                    Apply
                  </button>
                </div>
              </div>
            </div>
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
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }
    .page {
      max-width: 860px;
      height: 100%;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
    }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      flex-shrink: 0;
    }
    h1 { color: var(--text-primary); font-size: 24px; font-weight: 700; margin: 0; }
    .date-nav { display: flex; align-items: center; gap: 8px; }
    .date-nav button { color: var(--text-muted); }
    .current-date { font-size: 14px; font-weight: 600; color: var(--text-primary); min-width: 108px; text-align: center; }
    .water-main {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      flex-shrink: 0;
    }
    .water-ring-card, .quick-add-card, .log-card {
      background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 20px;
    }
    .ring-container { position: relative; width: 188px; height: 188px; margin: 0 auto; }
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
    .quick-add-card {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
    }
    .quick-add-card h3 {
      align-self: flex-start;
      text-align: left;
      margin-bottom: 14px;
    }
    .quick-add-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
      margin-top: auto;
      margin-bottom: auto;
    }
    .quick-controls-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(70px, auto));
      justify-content: center;
      align-items: center;
      column-gap: 10px;
      row-gap: 12px;
    }
    .quick-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-color: rgba(255,255,255,0.1) !important;
      color: var(--text-primary) !important;
      border-radius: 999px;
      height: 36px;
      min-width: 70px;
      padding: 0 14px;
      font-weight: 700;
    }
    .quick-btn:hover {
      border-color: var(--accent) !important;
      color: var(--accent) !important;
    }
    .quick-mode-btn {
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.04);
      color: var(--text-muted);
      transition: all 0.15s ease;
      flex-shrink: 0;
      cursor: pointer;
    }
    .quick-mode-minus {
      grid-column: 2;
      justify-self: center;
    }
    .quick-mode-plus {
      grid-column: 3;
      justify-self: center;
    }
    .quick-mode-btn:hover:not(.active) {
      border-color: var(--accent);
      color: var(--accent);
      background: rgba(200,241,53,0.06);
    }
    .quick-mode-btn.active {
      border-color: transparent;
      background: var(--accent);
      color: #0d0d0d;
      box-shadow: 0 10px 20px rgba(200,241,53,0.18);
    }
    .quick-mode-btn mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .quick-custom-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .quick-custom-panel {
      width: 100%;
      min-height: 38px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    .quick-custom-panel:not(.open) {
      visibility: hidden;
      pointer-events: none;
    }
    .quick-custom-btn,
    .quick-custom-apply {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      height: 34px;
      padding: 0 16px;
      font-weight: 700;
    }
    .quick-custom-btn {
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .quick-custom-btn:hover,
    .quick-custom-btn.active {
      border-color: var(--accent);
      color: #0d0d0d;
      background: var(--accent);
      box-shadow: 0 10px 20px rgba(200,241,53,0.16);
    }
    .quick-custom-entry {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      max-width: 280px;
    }
    .quick-custom-input {
      width: 100%;
      height: 38px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      color: var(--text-primary);
      padding: 0 14px;
      outline: none;
      font-size: 14px;
      font-weight: 600;
    }
    .quick-custom-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(200,241,53,0.08);
    }
    .quick-custom-input::placeholder {
      color: var(--text-muted);
    }
    .quick-custom-apply {
      min-width: 84px;
      border-color: rgba(255,255,255,0.12) !important;
      color: var(--text-primary) !important;
    }
    .quick-custom-apply:hover:not(:disabled) {
      border-color: var(--accent) !important;
      color: var(--accent) !important;
    }
    .log-card {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .entries {
      display: flex; flex-direction: column; gap: 6px;
      max-height: 144px;
      min-height: 0;
      overflow: auto;
      padding-right: 4px;
    }
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
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
      flex-shrink: 0;
    }
    @media (max-width: 768px), (max-height: 880px) {
      :host {
        height: auto;
        min-height: 100%;
        overflow: visible;
      }
      .page {
        height: auto;
        min-height: 100%;
        overflow: visible;
        padding-bottom: 16px;
      }
    }
    @media (max-width: 768px) {
      .water-main { grid-template-columns: 1fr; }
      .stats-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 520px) {
      .quick-controls-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
      .quick-mode-minus { grid-column: 1; justify-self: end; }
      .quick-mode-plus { grid-column: 2; justify-self: start; }
      .quick-custom-entry { flex-direction: column; max-width: 100%; }
      .quick-custom-apply { width: 100%; }
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
  quickAdjustMode: 'add' | 'remove' = 'add';
  showCustomInput = false;
  customAmountInput = '';

  get hasCustomAmount(): boolean {
    return this.customAmountInput.trim().length > 0;
  }

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
    this.adjustWater(amountOz);
  }

  setQuickAdjustMode(mode: 'add' | 'remove'): void {
    this.quickAdjustMode = mode;
  }

  toggleCustomInput(): void {
    this.showCustomInput = !this.showCustomInput;
    if (!this.showCustomInput) {
      this.customAmountInput = '';
    }
  }

  applyQuickAmount(amountOz: number): void {
    this.adjustWater(this.quickAdjustMode === 'remove' ? -amountOz : amountOz);
  }

  applyCustomAmount(): void {
    const parsedAmount = Number.parseFloat(this.customAmountInput.trim());
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      this.snackBar.open('Enter a valid amount of water in oz.', 'Close', { duration: 2500 });
      return;
    }

    this.adjustWater(this.quickAdjustMode === 'remove' ? -parsedAmount : parsedAmount);
    this.customAmountInput = '';
    this.showCustomInput = false;
  }

  adjustWater(amountOz: number): void {
    const currentOz = this.water?.totalOz || 0;
    if (amountOz < 0 && currentOz <= 0) {
      return;
    }

    const delta = amountOz < 0
      ? -Math.min(Math.abs(amountOz), currentOz)
      : amountOz;

    this.addingWater = true;
    this.waterService.logWater(this.dateStr, delta)
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
            const message = delta > 0 ? `+${delta} oz logged` : `${Math.abs(delta)} oz removed`;
            this.snackBar.open(message, 'Close', { duration: 2000 });
          }
        },
        error: () => {
          this.addingWater = false;
          this.snackBar.open('Failed to update water', 'Close', { duration: 3000 });
        },
      });
  }

  private loadWater(): void {
    this.waterService.getWaterIntake(this.dateStr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(water => this.water = water);
  }
}
