import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { MacroBarComponent } from '../../shared/components/macro-bar/macro-bar.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { WorkoutQuickAddComponent } from '@app/shared/components/workout-quick-add/workout-quick-add.component';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { WaterService } from '../../core/services/water.service';
import { ConfettiService } from '../../core/services/confetti.service';
import { DashboardSummary } from '../../core/models/analytics.model';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    StatCardComponent, MacroBarComponent, LoadingSpinnerComponent,
    WorkoutQuickAddComponent,
  ],
  template: `
    @if (loading) {
      <app-loading-spinner />
    } @else if (loadError) {
      <div class="error-state">
        <mat-icon svgIcon="mx-alert-triangle" class="error-icon"></mat-icon>
        <h2>Failed to load dashboard</h2>
        <p>There was a problem fetching your data. This usually fixes itself on retry.</p>
        <button mat-flat-button class="retry-btn" (click)="retryLoad()">Retry</button>
      </div>
    } @else if (summary) {
      <div class="dashboard">
        <div class="page-header">
          <div>
            <h1>Good {{ timeOfDay }}, {{ displayFirstName }}</h1>
            <div class="date-nav">
              <button mat-icon-button (click)="prevDay()"><mat-icon svgIcon="mx-chevron-left"></mat-icon></button>
              <span class="date-display">{{ today | date:'EEE, MMM d' }}</span>
              <button mat-icon-button (click)="nextDay()"><mat-icon svgIcon="mx-chevron-right"></mat-icon></button>
              <button mat-icon-button (click)="datePicker.open()" matTooltip="Pick date" class="calendar-btn">
                <mat-icon svgIcon="mx-calendar"></mat-icon>
              </button>
              <input [matDatepicker]="datePicker" [ngModel]="today" (ngModelChange)="onDateChange($event)" class="date-picker-input" readonly>
              <mat-datepicker #datePicker></mat-datepicker>
            </div>
          </div>
          <div class="quick-actions">
            <button mat-flat-button (click)="openWorkoutModal()" class="action-btn">
              <mat-icon svgIcon="mx-plus"></mat-icon> Log Workout
            </button>
          </div>
        </div>

        <div class="stats-grid">
          <app-stat-card svgIcon="mx-flame" label="Streak"
            [value]="summary.streak.currentStreak + 'd'"
            [subtitle]="'Best: ' + summary.streak.longestStreak + 'd'"
            [highlight]="summary.streak.currentStreak > 0" />
          <app-stat-card svgIcon="mx-dumbbell" label="Total Workouts"
            [value]="summary.streak.totalWorkouts" />
          <app-stat-card svgIcon="mx-utensils" label="Calories Today"
            [value]="summary.nutritionToday?.totalCalories || 0"
            [subtitle]="'/ ' + (user?.dailyCalorieTarget || 2000) + ' kcal'" />
          <app-stat-card svgIcon="mx-droplet" label="Water Today"
            [value]="(summary.waterToday?.totalOz || 0) + ' oz'"
            [subtitle]="'/ ' + (summary.waterToday?.goalOz || user?.dailyWaterGoalOz || 64) + ' oz'"
            [highlight]="summary.waterToday?.goalMet || false" />
        </div>

        <div class="dashboard-body">
          <div class="content-grid">
          <mat-card class="section-card">
            <div class="section-header">
              <h3>Today's Workout</h3>
              <button mat-button (click)="openWorkoutModal()" class="section-link">Log Workout</button>
            </div>
            @if (summary.workoutToday) {
              <div class="exercise-list">
                @for (ex of summary.workoutToday.exercises; track ex.name) {
                  <div class="exercise-row">
                    <span class="exercise-name">{{ ex.name }}</span>
                    <span class="exercise-detail">{{ ex.sets.length }} sets &middot; {{ ex.muscleGroup }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-section">
                <mat-icon svgIcon="mx-dumbbell"></mat-icon>
                <p>No workout logged today</p>
              </div>
            }
          </mat-card>

          <mat-card class="section-card">
            <div class="section-header">
              <h3>Macros</h3>
              <a mat-button routerLink="/nutrition" class="section-link">View All</a>
            </div>
            <div class="macros-stacked">
              <div class="pie-wrapper"
                [style.--p-pct]="proteinPct + '%'"
                [style.--c-pct]="carbsPct + '%'"
                [style.--f-pct]="fatPct + '%'">
                <div class="pie-donut"></div>
                <div class="pie-hole">
                  <span class="pie-cal">{{ summary.nutritionToday?.totalCalories || 0 | number:'1.0-0' }}</span>
                  <span class="pie-unit">cal</span>
                </div>
              </div>
              <div class="pie-legend">
                <div class="legend-item"><span class="legend-dot protein"></span> Protein <strong>{{ summary.nutritionToday?.totalProteinG || 0 | number:'1.0-0' }}g</strong></div>
                <div class="legend-item"><span class="legend-dot carbs"></span> Carbs <strong>{{ summary.nutritionToday?.totalCarbsG || 0 | number:'1.0-0' }}g</strong></div>
                <div class="legend-item"><span class="legend-dot fat"></span> Fat <strong>{{ summary.nutritionToday?.totalFatG || 0 | number:'1.0-0' }}g</strong></div>
              </div>
            </div>
          </mat-card>

          <mat-card class="section-card">
            <div class="section-header">
              <h3>Water Intake</h3>
              <a mat-button routerLink="/water" class="section-link">Track</a>
            </div>
            <div class="water-section">
              <div class="water-visual">
                <div class="water-ring">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width="8"
                      [attr.stroke-dasharray]="waterCircumference"
                      [attr.stroke-dashoffset]="waterOffset"
                      stroke-linecap="round" transform="rotate(-90 60 60)"/>
                  </svg>
                  <div class="water-center">
                    <span class="water-amount">{{ summary.waterToday?.totalOz || 0 }}</span>
                    <span class="water-unit">oz</span>
                  </div>
                </div>
              </div>
              <div class="water-quick-row">
                <button class="water-step-btn minus" (click)="quickAddWater(-8)" [disabled]="addingWater || (summary.waterToday?.totalOz || 0) <= 0" aria-label="Remove 8oz">
                  <mat-icon svgIcon="mx-minus"></mat-icon>
                </button>
                @for (amt of waterQuickAmounts; track amt) {
                  <button mat-stroked-button class="water-quick-btn" (click)="quickAddWater(amt)" [disabled]="addingWater">
                    {{ amt }}oz
                  </button>
                }
                <button class="water-step-btn plus" (click)="quickAddWater(8)" [disabled]="addingWater" aria-label="Add 8oz">
                  <mat-icon svgIcon="mx-plus"></mat-icon>
                </button>
              </div>
              @if (summary.waterToday?.goalMet) {
                <span class="goal-met">Goal Met!</span>
              }
            </div>
          </mat-card>
          </div>
        </div>

        <div class="bottom-grid">
          <mat-card class="section-card prs-card">
            <div class="section-header">
              <h3>Recent PRs</h3>
              <a mat-button routerLink="/prs" class="section-link">View All</a>
            </div>
            @if (summary.recentPRs.length > 0) {
              <div class="pr-list">
                @for (pr of summary.recentPRs; track pr.id) {
                  <div class="pr-item">
                    <mat-icon class="pr-icon" svgIcon="mx-trophy"></mat-icon>
                    <div class="pr-details">
                      <span class="pr-exercise">{{ pr.exerciseName }}</span>
                      <span class="pr-stats">{{ pr.weightLbs }} lbs x {{ pr.reps }} reps</span>
                    </div>
                    <span class="pr-1rm">{{ pr.oneRepMaxLbs | number:'1.0-0' }} 1RM</span>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-section">
                <mat-icon svgIcon="mx-trophy"></mat-icon>
                <p>No PRs yet — log workouts to track personal records here.</p>
              </div>
            }
          </mat-card>

          <mat-card class="section-card spotify-card">
            <div class="section-header">
              <h3>Now Playing</h3>
              <div class="music-service-toggle">
                <button class="svc-btn" [class.active]="musicService === 'spotify'" (click)="musicService = 'spotify'">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  Spotify
                </button>
                <button class="svc-btn" [class.active]="musicService === 'apple'" (click)="musicService = 'apple'">
                  <svg viewBox="0 0 20 20" width="14" height="14">
                    <defs><linearGradient id="am-sm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FA233B"/><stop offset="100%" stop-color="#FB5C74"/></linearGradient></defs>
                    <rect width="20" height="20" rx="4.5" fill="url(#am-sm)"/>
                    <path fill="#fff" d="M14 4.5a.5.5 0 0 0-.58-.49l-5 1A.5.5 0 0 0 8 5.5V12a2 2 0 1 0 1 1.73V7.36l4-.8V11a2 2 0 1 0 1 1.73Z"/>
                  </svg>
                  Apple Music
                </button>
              </div>
            </div>
            @if (spotifyConnected) {
              <div class="spotify-player">
                <div class="track-info">
                  <div class="album-art-placeholder">
                    <mat-icon svgIcon="mx-music"></mat-icon>
                  </div>
                  <div class="track-details">
                    <span class="track-name">{{ currentTrack }}</span>
                    <span class="track-artist">{{ currentArtist }}</span>
                  </div>
                </div>
                <div class="player-controls">
                  <button mat-icon-button class="ctrl-btn" (click)="prevTrack()">
                    <mat-icon svgIcon="mx-chevron-left"></mat-icon>
                  </button>
                  <button mat-icon-button class="ctrl-btn play-btn" (click)="togglePlay()">
                    <mat-icon [svgIcon]="isPlaying ? 'mx-x' : 'mx-plus'"></mat-icon>
                  </button>
                  <button mat-icon-button class="ctrl-btn" (click)="nextTrack()">
                    <mat-icon svgIcon="mx-chevron-right"></mat-icon>
                  </button>
                </div>
              </div>
            } @else {
              <div class="spotify-connect">
                <div class="spotify-logo">
                  @if (musicService === 'spotify') {
                    <svg viewBox="0 0 24 24" width="40" height="40">
                      <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  } @else {
                    <svg viewBox="0 0 40 40" width="40" height="40">
                      <defs>
                        <linearGradient id="am-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#FA233B"/>
                          <stop offset="100%" stop-color="#FB5C74"/>
                        </linearGradient>
                      </defs>
                      <rect width="40" height="40" rx="9" fill="url(#am-grad)"/>
                      <path fill="#fff" d="M27 9a1 1 0 0 0-1.16-.98l-10 2A1 1 0 0 0 15 11v13a4 4 0 1 0 2 3.46V15.72l8-1.6V22a4 4 0 1 0 2 3.46Z"/>
                    </svg>
                  }
                </div>
                <p class="spotify-desc">Connect {{ musicService === 'spotify' ? 'Spotify' : 'Apple Music' }} to control your music while you train</p>
                <button mat-stroked-button
                  [class.spotify-connect-btn]="musicService === 'spotify'"
                  [class.apple-connect-btn]="musicService === 'apple'"
                  (click)="connectMusic()">
                  Connect {{ musicService === 'spotify' ? 'Spotify' : 'Apple Music' }}
                </button>
              </div>
            }
          </mat-card>
        </div>
      </div>

      @if (workoutModalOpen) {
        <div class="modal-backdrop" (click)="closeWorkoutModal()">
          <div class="modal-panel workout-modal" (click)="$event.stopPropagation()">
            <app-workout-quick-add
              [initialDate]="today"
              (saved)="onWorkoutSaved()"
              (cancelled)="closeWorkoutModal()" />
          </div>
        </div>
      }

      @if (showAiToast && aiSuggestion) {
        <div class="ai-toast" [class.fade-out]="aiToastFading" [class.minimized]="aiMinimized"
          (mouseenter)="onAiHover()" (mouseleave)="onAiLeave()">
          @if (aiMinimized) {
            <button class="ai-minimized-btn" (click)="aiMinimized = false">
              <mat-icon svgIcon="mx-ai" class="ai-icon"></mat-icon>
              <span>AI Suggestion</span>
              <mat-icon svgIcon="mx-chevron-left" class="expand-icon"></mat-icon>
            </button>
          } @else {
            <div class="ai-toast-header">
              <mat-icon svgIcon="mx-ai" class="ai-icon"></mat-icon>
              <span class="ai-title">AI Suggestion</span>
              <button class="ai-close-btn" (click)="aiMinimized = true" aria-label="Minimize" title="Minimize">
                <mat-icon svgIcon="mx-minus"></mat-icon>
              </button>
              <button class="ai-close-btn" (click)="dismissAiToast()" aria-label="Dismiss" title="Close">
                <mat-icon svgIcon="mx-x"></mat-icon>
              </button>
            </div>
            <p class="ai-toast-text">{{ aiSuggestion }}</p>
            <div class="ai-actions">
              <button mat-stroked-button class="ai-chat-btn" (click)="openAiChat()">
                Ask a question
              </button>
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; height: 100%; min-height: 0; overflow: hidden; }
    .dashboard {
      max-width: 1200px; margin: 0 auto;
      height: 100%;
      display: flex; flex-direction: column;
      gap: 8px; padding: 0;
      overflow: hidden;
    }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 0; flex-wrap: wrap; gap: 10px; flex-shrink: 0;
    }
    h1 { color: var(--text-primary); font-size: 22px; font-weight: 700; margin: 0; }
    .date-nav { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
    .date-nav button { color: var(--text-muted); }
    .date-display { color: var(--text-muted); font-size: 13px; min-width: 120px; text-align: center; }
    .calendar-btn { color: var(--text-muted); }
    .calendar-btn:hover { color: var(--accent); }
    .date-picker-input { position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none; }
    .action-btn {
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 600; border-radius: 10px; padding: 0 14px; height: 36px;
    }
    .action-btn-outline {
      border-color: var(--accent) !important; color: var(--accent) !important;
      font-weight: 600; border-radius: 10px;
    }
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 24px;
    }
    .modal-panel.workout-modal {
      background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px; padding: 24px; max-width: 480px; width: 100%;
      max-height: 90vh; overflow-y: auto;
    }

    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 10px; margin-bottom: 0; flex-shrink: 0;
    }
    .stats-grid > * { min-height: 0; }

    .dashboard-body {
      flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px;
    }

    .content-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 10px; margin-bottom: 10px; flex: 1; min-height: 0;
    }

    .bottom-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 10px; margin-bottom: 0; flex: 1; min-height: 0;
    }

    .section-card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; padding: 12px;
      min-height: 0; display: flex; flex-direction: column;
    }
    .section-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 8px; flex-shrink: 0;
    }
    .section-header h3 {
      font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 0;
    }
    .section-link { color: var(--accent) !important; font-size: 12px; font-weight: 600; }

    .exercise-list { display: flex; flex-direction: column; gap: 6px; min-height: 0; overflow: auto; }
    .exercise-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 6px;
    }
    .exercise-name { color: var(--text-primary); font-weight: 500; font-size: 13px; }
    .exercise-detail { color: var(--text-muted); font-size: 12px; }
    .empty-section {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 16px; color: var(--text-muted); flex: 1; min-height: 60px;
    }
    .empty-section mat-icon { font-size: 24px; width: 24px; height: 24px; opacity: 0.3; margin-bottom: 4px; }
    .empty-section p { font-size: 12px; margin: 0; }

    /* ── Macro pie chart (CSS conic-gradient) ── */
    .macros-stacked {
      display: flex; flex-direction: column; align-items: center; gap: 10px; flex: 1; min-height: 0;
    }
    .pie-wrapper {
      position: relative; width: 72px; height: 72px; flex-shrink: 0;
    }
    .pie-donut {
      width: 100%; height: 100%; border-radius: 50%;
      background: conic-gradient(
        from 0deg,
        #4fc3f7 0% var(--p-pct, 0%),
        #C8F135 var(--p-pct, 0%) var(--c-pct, 0%),
        #ff7043 var(--c-pct, 0%) var(--f-pct, 100%),
        rgba(255,255,255,0.04) var(--f-pct, 100%) 100%
      );
    }
    .pie-hole {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--bg-surface);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .pie-cal { font-size: 13px; font-weight: 700; color: var(--text-primary); line-height: 1; }
    .pie-unit { font-size: 9px; color: var(--text-muted); line-height: 1; margin-top: 1px; }
    .pie-legend { display: flex; flex-direction: column; gap: 4px; align-items: center; }
    .legend-item {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: var(--text-muted);
    }
    .legend-item strong { color: var(--text-primary); }
    .legend-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .legend-dot.protein { background: #4fc3f7; }
    .legend-dot.carbs { background: #C8F135; }
    .legend-dot.fat { background: #ff7043; }

    /* ── Water quick-add ── */
    .water-section { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; min-height: 0; }
    .water-visual { position: relative; flex-shrink: 0; }
    .water-ring { position: relative; width: 80px; height: 80px; }
    .water-ring svg { width: 100%; height: 100%; }
    .water-ring circle { transition: stroke-dashoffset 0.6s ease; }
    .water-center {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .water-amount { font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .water-unit { font-size: 10px; color: var(--text-muted); }
    .water-quick-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; }
    .water-step-btn {
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      background: none;
      color: var(--text-muted);
      border: 1.5px solid rgba(255,255,255,0.15);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0;
    }
    .water-step-btn:hover:not(:disabled) {
      border-color: var(--accent);
      color: var(--accent);
      background: rgba(200,241,53,0.06);
    }
    .water-step-btn:disabled {
      opacity: 0.25; cursor: default;
    }
    .water-step-btn mat-icon { width: 16px; height: 16px; font-size: 16px; }
    .water-quick-btn {
      border-color: rgba(255,255,255,0.15) !important;
      color: var(--text-primary) !important;
      font-weight: 600; font-size: 11px;
      border-radius: 6px; min-width: 0; padding: 2px 10px;
      height: 28px;
    }
    .water-quick-btn:hover {
      border-color: var(--accent) !important; color: var(--accent) !important;
    }
    .goal-met { font-size: 12px; font-weight: 700; color: var(--accent); }

    /* PRs */
    .prs-card { border-color: rgba(200,241,53,0.15); }
    .pr-list { display: flex; flex-direction: column; gap: 6px; min-height: 0; overflow: auto; }
    .pr-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; background: rgba(200,241,53,0.04); border-radius: 6px;
    }
    .pr-icon { color: var(--accent); font-size: 18px; width: 18px; height: 18px; }
    .pr-details { flex: 1; display: flex; flex-direction: column; }
    .pr-exercise { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .pr-stats { font-size: 11px; color: var(--text-muted); }
    .pr-1rm { font-size: 13px; font-weight: 700; color: var(--accent); }

    /* Music service toggle */
    .music-service-toggle {
      display: flex; gap: 2px; background: rgba(255,255,255,0.04);
      border-radius: 8px; padding: 2px;
    }
    .svc-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 6px;
      background: none; border: none; color: var(--text-muted);
      font-size: 11px; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .svc-btn.active {
      background: rgba(255,255,255,0.08); color: var(--text-primary);
    }
    .svc-btn.active.spotify-active {
      background: rgba(29,185,84,0.15) !important; color: #1DB954 !important;
    }
    .svc-btn:hover:not(.active) { color: var(--text-primary); }

    /* Spotify/Apple Music */
    .connect-badge {
      font-size: 11px; color: var(--text-muted);
      background: rgba(255,255,255,0.04); padding: 3px 10px;
      border-radius: 20px; font-weight: 500;
    }
    .spotify-connect {
      display: flex; flex-direction: column; align-items: center;
      padding: 12px 0 4px; gap: 8px;
    }
    .spotify-logo { opacity: 0.8; }
    .spotify-desc { font-size: 12px; color: var(--text-muted); text-align: center; margin: 0; }
    .spotify-connect-btn {
      border-color: #1DB954 !important; color: #1DB954 !important;
      font-weight: 600; font-size: 13px; border-radius: 20px;
    }
    .spotify-connect-btn:hover { background: rgba(29,185,84,0.08) !important; }
    .apple-connect-btn {
      border-color: #FC3C44 !important; color: #FC3C44 !important;
      font-weight: 600; font-size: 13px; border-radius: 20px;
    }
    .apple-connect-btn:hover { background: rgba(252,60,68,0.08) !important; }
    .spotify-player { display: flex; flex-direction: column; gap: 14px; }
    .track-info { display: flex; align-items: center; gap: 12px; }
    .album-art-placeholder {
      width: 48px; height: 48px; border-radius: 8px;
      background: rgba(29,185,84,0.1); display: flex;
      align-items: center; justify-content: center;
    }
    .album-art-placeholder mat-icon { color: #1DB954; }
    .track-details { flex: 1; display: flex; flex-direction: column; }
    .track-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .track-artist { font-size: 12px; color: var(--text-muted); }
    .player-controls { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .ctrl-btn { color: var(--text-muted); }
    .ctrl-btn:hover { color: var(--text-primary); }
    .play-btn { color: #1DB954 !important; }

    /* ── AI Toast ── */
    @keyframes slide-in-up {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ai-toast {
      position: fixed; bottom: 24px; right: 24px;
      width: 340px; max-width: calc(100vw - 48px);
      background: var(--bg-surface);
      border: 1px solid rgba(200,241,53,0.2);
      border-radius: 14px; padding: 16px;
      z-index: 1000;
      animation: slide-in-up 0.4s ease-out;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .ai-toast.fade-out { opacity: 0; transform: translateY(16px); }
    .ai-toast-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
    }
    .ai-icon { width: 18px; height: 18px; color: var(--accent); flex-shrink: 0; }
    .ai-title {
      font-size: 13px; font-weight: 700; color: var(--accent);
      flex: 1;
    }
    .ai-close-btn {
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer;
      color: var(--text-muted); border-radius: 50%;
      padding: 0; flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }
    .ai-close-btn:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
    .ai-close-btn mat-icon { width: 16px; height: 16px; font-size: 16px; }
    .ai-toast-text {
      color: var(--text-muted); font-size: 13px; line-height: 1.5; margin: 0;
    }
    .ai-actions { margin-top: 10px; }
    .ai-chat-btn {
      border-color: var(--accent) !important; color: var(--accent) !important;
      font-size: 12px; font-weight: 600; border-radius: 8px;
      width: 100%; height: 32px;
    }
    .ai-chat-btn:hover { background: rgba(200,241,53,0.06) !important; }
    .ai-toast.minimized {
      width: auto; padding: 0; border-radius: 24px;
    }
    .ai-minimized-btn {
      display: flex; align-items: center; gap: 6px;
      background: none; border: none; color: var(--accent);
      font-size: 12px; font-weight: 600; cursor: pointer;
      padding: 10px 14px; white-space: nowrap;
    }
    .ai-minimized-btn .expand-icon {
      width: 14px; height: 14px; transform: rotate(180deg);
    }
    .ai-minimized-btn:hover { background: rgba(200,241,53,0.04); border-radius: 24px; }

    /* Error state */
    .error-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 400px; text-align: center; padding: 48px 24px;
    }
    .error-icon { width: 48px; height: 48px; color: #ff7043; margin-bottom: 16px; }
    .error-state h2 { color: var(--text-primary); font-size: 20px; font-weight: 600; margin: 0 0 8px; }
    .error-state p { color: var(--text-muted); font-size: 14px; margin: 0 0 24px; max-width: 360px; }
    .retry-btn {
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 600; border-radius: 10px;
    }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .content-grid { grid-template-columns: 1fr; }
      .bottom-grid { grid-template-columns: 1fr; }
      .macros-stacked { justify-content: center; }
      .water-section { align-items: center; }
      .section-card { max-width: 100%; }
    }
    @media (max-width: 600px) {
      .stats-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 10px; }
      .water-quick-row { flex-wrap: wrap; justify-content: center; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  summary: DashboardSummary | null = null;
  user: UserProfile | null = null;
  loading = true;
  loadError = false;
  today = new Date();
  addingWater = false;
  aiSuggestion: string | null = null;
  showAiToast = false;
  aiToastFading = false;
  waterQuickAmounts = [8, 16, 24];
  workoutModalOpen = false;

  spotifyConnected = false;
  isPlaying = false;
  currentTrack = '';
  currentArtist = '';
  musicService: 'spotify' | 'apple' = 'spotify';
  aiMinimized = false;
  private aiHovered = false;
  private aiAutoTimer: any = null;
  private confettiFiredThisSession = new Set<string>();

  readonly waterCircumference = 2 * Math.PI * 52;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly authService: AuthService,
    private readonly waterService: WaterService,
    private readonly confettiService: ConfettiService,
    private readonly snackBar: MatSnackBar,
  ) {}

  openWorkoutModal(): void {
    this.workoutModalOpen = true;
  }

  closeWorkoutModal(): void {
    this.workoutModalOpen = false;
  }

  onWorkoutSaved(): void {
    this.workoutModalOpen = false;
    this.fetchDashboard(true);
    this.snackBar.open('Workout saved!', 'Close', { duration: 3000 });
  }

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => this.user = user);

    this.fetchDashboard();
  }

  retryLoad(): void {
    this.loading = true;
    this.loadError = false;
    this.fetchDashboard();
  }

  get dateStr(): string {
    const d = this.today;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private fetchDashboard(isRefreshAfterSave = false): void {
    this.analyticsService.getDashboardSummary(this.dateStr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: summary => {
          this.summary = summary;
          this.loading = false;
          this.loadError = false;
          this.generateAiSuggestion(summary);
          const dateKey = this.dateStr;
          if (summary.waterToday?.goalMet && !this.confettiFiredThisSession.has('water-' + dateKey)) {
            this.confettiFiredThisSession.add('water-' + dateKey);
            this.confettiService.burst();
          }
        },
        error: () => {
          this.loading = false;
          if (isRefreshAfterSave && this.summary) {
            this.loadError = false;
            this.snackBar.open('Workout saved. Couldn\'t refresh dashboard — pull to retry.', 'OK', { duration: 4000 });
          } else {
            this.loadError = true;
          }
        },
      });
  }

  get displayFirstName(): string {
    return this.user?.firstName ?? this.user?.displayName?.split(' ')[0] ?? 'Athlete';
  }

  get timeOfDay(): string {
    const hour = this.today.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  get waterOffset(): number {
    if (!this.summary?.waterToday) return this.waterCircumference;
    const pct = Math.min(this.summary.waterToday.totalOz / (this.summary.waterToday.goalOz || 64), 1);
    return this.waterCircumference * (1 - pct);
  }

  get proteinPct(): number {
    const n = this.summary?.nutritionToday;
    if (!n) return 0;
    const total = (n.totalProteinG || 0) + (n.totalCarbsG || 0) + (n.totalFatG || 0);
    if (total <= 0) return 0;
    return ((n.totalProteinG || 0) / total) * 100;
  }

  get carbsPct(): number {
    return this.proteinPct + this._carbsRawPct;
  }

  get fatPct(): number {
    return this.carbsPct + this._fatRawPct;
  }

  private get _carbsRawPct(): number {
    const n = this.summary?.nutritionToday;
    if (!n) return 0;
    const total = (n.totalProteinG || 0) + (n.totalCarbsG || 0) + (n.totalFatG || 0);
    if (total <= 0) return 0;
    return ((n.totalCarbsG || 0) / total) * 100;
  }

  private get _fatRawPct(): number {
    const n = this.summary?.nutritionToday;
    if (!n) return 0;
    const total = (n.totalProteinG || 0) + (n.totalCarbsG || 0) + (n.totalFatG || 0);
    if (total <= 0) return 0;
    return ((n.totalFatG || 0) / total) * 100;
  }

  quickAddWater(amountOz: number): void {
    this.addingWater = true;
    const dateStr = this.dateStr;

    if (amountOz < 0) {
      const absAmount = Math.abs(amountOz);
      const currentOz = this.summary?.waterToday?.totalOz || 0;
      if (currentOz <= 0) { this.addingWater = false; return; }
      const removeAmount = Math.min(absAmount, currentOz);
      this.waterService.logWater(dateStr, -removeAmount)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: water => {
            this.addingWater = false;
            if (this.summary) {
              this.summary = { ...this.summary, waterToday: water };
              this.snackBar.open(`-${removeAmount} oz removed`, 'Close', { duration: 2000 });
            }
          },
          error: () => {
            this.addingWater = false;
            this.snackBar.open('Failed to update water', 'Close', { duration: 3000 });
          },
        });
      return;
    }

    this.waterService.logWater(dateStr, amountOz)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: water => {
          this.addingWater = false;
            if (this.summary) {
              const wasGoalMet = this.summary.waterToday?.goalMet || false;
              this.summary = { ...this.summary, waterToday: water };
              const dateKey = this.dateStr;
            if (water.goalMet && !wasGoalMet && !this.confettiFiredThisSession.has('water-' + dateKey)) {
              this.confettiFiredThisSession.add('water-' + dateKey);
              this.confettiService.burst();
              this.snackBar.open('Daily water goal reached!', 'Nice!', { duration: 4000 });
            } else {
              this.snackBar.open(`+${amountOz} oz logged`, 'Close', { duration: 2000 });
            }
          }
        },
        error: () => {
          this.addingWater = false;
          this.snackBar.open('Failed to log water', 'Close', { duration: 3000 });
        },
      });
  }

  prevDay(): void {
    this.today = new Date(this.today.getTime() - 86400000);
    this.fetchDashboard();
  }

  nextDay(): void {
    this.today = new Date(this.today.getTime() + 86400000);
    this.fetchDashboard();
  }

  onDateChange(date: Date | null): void {
    if (!date) return;
    this.today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    this.fetchDashboard();
  }

  connectMusic(): void {
    const svc = this.musicService === 'spotify' ? 'Spotify' : 'Apple Music';
    this.snackBar.open(`${svc} integration coming soon!`, 'Close', { duration: 3000 });
  }

  prevTrack(): void {}
  nextTrack(): void {}
  togglePlay(): void { this.isPlaying = !this.isPlaying; }

  onAiHover(): void {
    this.aiHovered = true;
    if (this.aiAutoTimer) { clearTimeout(this.aiAutoTimer); this.aiAutoTimer = null; }
  }

  onAiLeave(): void {
    this.aiHovered = false;
  }

  openAiChat(): void {
    this.snackBar.open('AI chat coming soon -- stay tuned!', 'Close', { duration: 3000 });
  }

  dismissAiToast(): void {
    this.aiToastFading = true;
    setTimeout(() => { this.showAiToast = false; this.aiToastFading = false; }, 500);
  }

  private generateAiSuggestion(summary: DashboardSummary): void {
    const aiEnabled = localStorage.getItem('pref_aiSuggestions') !== 'false';
    if (!aiEnabled) return;

    if (summary.recentPRs.length > 0) {
      const pr = summary.recentPRs[0];
      const nextWeight = Math.round(pr.weightLbs * 1.05);
      this.aiSuggestion = `Based on your ${pr.exerciseName} PR of ${pr.weightLbs} lbs x ${pr.reps} reps, ` +
        `try ${nextWeight} lbs for ${Math.max(pr.reps - 1, 1)} reps next session. ` +
        `Progressive overload of ~5% is optimal for steady gains.`;
    } else if (summary.streak.currentStreak >= 3) {
      this.aiSuggestion = `Great consistency with a ${summary.streak.currentStreak}-day streak! ` +
        `Consider adding 5-10 lbs to your compounds this week.`;
    } else if (summary.streak.totalWorkouts > 0) {
      this.aiSuggestion = `You've logged ${summary.streak.totalWorkouts} workout${summary.streak.totalWorkouts > 1 ? 's' : ''}. ` +
        `Keep building consistency — aim for at least 3 sessions per week to maximize progress.`;
    }

    if (this.aiSuggestion) {
      setTimeout(() => { this.showAiToast = true; }, 1500);
      this.aiAutoTimer = setTimeout(() => {
        if (!this.aiHovered) { this.dismissAiToast(); }
      }, 15000);
    }
  }
}
