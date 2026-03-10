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
import { Observable, catchError, interval, of, switchMap, timer } from 'rxjs';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { WorkoutQuickAddComponent } from '@app/shared/components/workout-quick-add/workout-quick-add.component';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { WaterService } from '../../core/services/water.service';
import { ConfettiService } from '../../core/services/confetti.service';
import { DashboardSummary } from '../../core/models/analytics.model';
import { UserProfile } from '../../core/models/user.model';
import { SpotifyPlaybackState, SpotifyRepeatMode, SpotifyService, SpotifyTrack } from '../../core/services/spotify.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    StatCardComponent, LoadingSpinnerComponent, WorkoutQuickAddComponent,
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
                    <span class="exercise-detail">{{ ex.sets.length }} sets - {{ ex.muscleGroup }}</span>
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
                <button class="water-step-btn" (click)="quickAddWater(-8)" [disabled]="addingWater || (summary.waterToday?.totalOz || 0) <= 0" aria-label="Remove 8oz">
                  <mat-icon svgIcon="mx-minus"></mat-icon>
                </button>
                @for (amt of waterQuickAmounts; track amt) {
                  <button mat-stroked-button class="water-quick-btn" (click)="quickAddWater(amt)" [disabled]="addingWater">
                    {{ amt }}oz
                  </button>
                }
                <button class="water-step-btn" (click)="quickAddWater(8)" [disabled]="addingWater" aria-label="Add 8oz">
                  <mat-icon svgIcon="mx-plus"></mat-icon>
                </button>
              </div>
              @if (summary.waterToday?.goalMet) {
                <span class="goal-met">Goal Met!</span>
              }
            </div>
          </mat-card>
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
                <p>No PRs yet. Log workouts to track personal records here.</p>
              </div>
            }
          </mat-card>

          <mat-card class="section-card spotify-card">
            <div class="section-header">
              <h3>Now Playing</h3>
              @if (spotifyConnected) {
                <button class="spotify-status-btn connected" (click)="disconnectSpotify()">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  <span class="spotify-status-label-wrap">
                    <span class="spotify-status-label spotify-status-label-default">Connected</span>
                    <span class="spotify-status-label spotify-status-label-hover">Disconnect</span>
                  </span>
                </button>
              } @else {
                <button class="spotify-status-btn connect" (click)="connectSpotify()">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  Connect Spotify
                </button>
              }
            </div>

            @if (spotifyConnected) {
              @if (spotifyTrack) {
                <div class="spotify-player">
                <div class="spotify-hero">
                  @if (spotifyTrack.albumImageUrl) {
                    <img [src]="spotifyTrack.albumImageUrl" alt="Album art" class="album-art-image" />
                  } @else {
                    <div class="album-art-placeholder">
                      <mat-icon svgIcon="mx-music"></mat-icon>
                    </div>
                  }
                  <span class="track-label">{{ spotifyPlayback?.isPlaying ? 'Now Playing' : 'Spotify Connected' }}</span>
                  <span class="track-name">{{ spotifyTrack.name || 'Ready when your music is.' }}</span>
                  <span class="track-meta">{{ spotifyTrack ? spotifyTrackMetaLine : spotifyDeviceLine }}</span>
                </div>

                @if (spotifyTrack) {
                  <div class="spotify-progress-row">
                    <span class="spotify-time">{{ spotifyElapsedLabel }}</span>
                    <div class="spotify-progress-track">
                      <div class="spotify-progress-fill" [style.width.%]="spotifyProgressPercent"></div>
                    </div>
                    <span class="spotify-time">{{ spotifyDurationLabel }}</span>
                  </div>
                }

                <div class="spotify-controls-row">
                  <button type="button" class="spotify-control-btn" [class.active]="spotifyPlayback?.shuffleEnabled" [disabled]="spotifyBusy || !canToggleSpotifyShuffleControl" (click)="toggleSpotifyShuffle()" aria-label="Toggle shuffle">
                    <mat-icon svgIcon="mx-shuffle"></mat-icon>
                  </button>
                  <button type="button" class="spotify-control-btn" [disabled]="spotifyBusy || !spotifyPlayback?.canSkipPrevious" (click)="skipSpotifyPrevious()" aria-label="Previous track">
                    <mat-icon svgIcon="mx-skip-back"></mat-icon>
                  </button>
                  <button type="button" class="spotify-control-btn primary" [disabled]="spotifyBusy || !canToggleSpotifyPlayback" (click)="toggleSpotifyPlayback()" [attr.aria-label]="spotifyPlayback?.isPlaying ? 'Pause' : 'Play'">
                    <mat-icon [svgIcon]="spotifyPlayback?.isPlaying ? 'mx-pause' : 'mx-play'"></mat-icon>
                  </button>
                  <button type="button" class="spotify-control-btn" [disabled]="spotifyBusy || !spotifyPlayback?.canSkipNext" (click)="skipSpotifyNext()" aria-label="Next track">
                    <mat-icon svgIcon="mx-skip-forward"></mat-icon>
                  </button>
                  <button type="button" class="spotify-control-btn" [class.active]="spotifyPlayback?.repeatMode !== 'off'" [class.track-repeat]="spotifyPlayback?.repeatMode === 'track'" [disabled]="spotifyBusy || !canToggleSpotifyRepeatControl" (click)="cycleSpotifyRepeatMode()" aria-label="Cycle repeat mode">
                    <mat-icon svgIcon="mx-repeat"></mat-icon>
                    @if (spotifyPlayback?.repeatMode === 'track') {
                      <span class="spotify-repeat-indicator">1</span>
                    }
                  </button>
                </div>

                <div class="spotify-meta-row">
                  <span class="playback-badge" [class.paused]="!spotifyPlayback?.isPlaying">{{ spotifyPlayback?.isPlaying ? 'Playing' : 'Paused' }}</span>
                  @if (spotifyPlayback?.deviceName) {
                    <span class="device-badge">{{ spotifyPlayback?.deviceName }}</span>
                  }
                  @if (spotifyPlayback?.repeatMode && spotifyPlayback?.repeatMode !== 'off') {
                    <span class="device-badge spotify-mode-badge">{{ spotifyRepeatLabel }}</span>
                  }
                  <button mat-button class="section-link" (click)="refreshSpotifyPlayback()">Refresh</button>
                  @if (spotifyTrack.externalUrl) {
                    <a mat-button class="section-link" [href]="spotifyTrack.externalUrl" target="_blank" rel="noopener">Open Track</a>
                  }
                </div>
              </div>
              } @else {
                <div class="spotify-player spotify-player-idle">
                  <div class="spotify-hero">
                    <div class="album-art-placeholder spotify-idle-placeholder">
                      <mat-icon svgIcon="mx-music"></mat-icon>
                    </div>
                    <span class="track-label">Spotify Connected</span>
                    <span class="track-name">Start something on Spotify</span>
                    <span class="track-meta">
                      {{ spotifyPlayback?.deviceName ? 'Press play on ' + spotifyPlayback?.deviceName + ' and this card will snap into place.' : 'Open Spotify on one of your devices and press play. We will keep the dashboard synced.' }}
                    </span>
                  </div>
                  <div class="spotify-meta-row spotify-meta-row-idle">
                    @if (spotifyPlayback?.deviceName) {
                      <span class="device-badge">{{ spotifyPlayback?.deviceName }}</span>
                    }
                    <button mat-button class="section-link" (click)="refreshSpotifyPlayback(false)">Check Again</button>
                  </div>
                </div>
              }
            } @else {
              <div class="spotify-connect">
                <div class="spotify-logo">
                  <svg viewBox="0 0 24 24" width="40" height="40">
                    <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </div>
                <p class="spotify-desc">Connect Spotify to show your current track and control playback right from the dashboard.</p>
                <button mat-stroked-button class="spotify-connect-btn" (click)="connectSpotify()">Connect Spotify</button>
              </div>
            }
          </mat-card>
        </div>

        @if (workoutModalOpen) {
          <div class="modal-backdrop" (click)="closeWorkoutModal()">
            <div class="modal-panel workout-modal" (click)="$event.stopPropagation()">
              <app-workout-quick-add [initialDate]="today" (saved)="onWorkoutSaved()" (cancelled)="closeWorkoutModal()" />
            </div>
          </div>
        }

        @if (showAiToast && aiSuggestion) {
          <div class="ai-toast" [class.fade-out]="aiToastFading" [class.minimized]="aiMinimized" (mouseenter)="onAiHover()" (mouseleave)="onAiLeave()">
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
                <button class="ai-close-btn" (click)="aiMinimized = true" aria-label="Minimize" title="Minimize"><mat-icon svgIcon="mx-minus"></mat-icon></button>
                <button class="ai-close-btn" (click)="dismissAiToast()" aria-label="Dismiss" title="Close"><mat-icon svgIcon="mx-x"></mat-icon></button>
              </div>
              <p class="ai-toast-text">{{ aiSuggestion }}</p>
              <div class="ai-actions">
                <button mat-stroked-button class="ai-chat-btn" (click)="openAiChat()">Ask a question</button>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; min-height: 100%; --spotify-green: #1DB954; }
    .dashboard { max-width: 1220px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; padding-bottom: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; }
    h1 { color: var(--text-primary); font-size: 21px; font-weight: 700; margin: 0; }
    .date-nav { display: flex; align-items: center; gap: 4px; margin-top: 2px; flex-wrap: wrap; }
    .date-nav button { color: var(--text-muted); }
    .date-display { color: var(--text-muted); font-size: 13px; min-width: 120px; text-align: center; }
    .calendar-btn { color: var(--text-muted); }
    .calendar-btn:hover { color: var(--accent); }
    .date-picker-input { position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none; }
    .action-btn { background: var(--accent) !important; color: #0d0d0d !important; font-weight: 600; border-radius: 10px; padding: 0 14px; height: 34px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .content-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .bottom-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 0.94fr); gap: 10px; align-items: stretch; }
    .section-card { background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)), var(--bg-surface); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 10px 12px; min-height: 0; display: flex; flex-direction: column; min-width: 0; }
    .section-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
    .section-header h3 { font-size: 12.5px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .section-link { color: var(--accent) !important; font-size: 11.5px; font-weight: 600; }
    .exercise-list, .pr-list { display: flex; flex-direction: column; gap: 5px; min-height: 0; overflow: auto; }
    .exercise-row { display: flex; justify-content: space-between; align-items: center; gap: 6px; padding: 5px 8px; background: rgba(255,255,255,0.03); border-radius: 8px; }
    .exercise-name { color: var(--text-primary); font-weight: 500; font-size: 12px; }
    .exercise-detail { color: var(--text-muted); font-size: 11px; text-align: right; }
    .empty-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; color: var(--text-muted); flex: 1; min-height: 88px; text-align: center; }
    .empty-section mat-icon { font-size: 22px; width: 22px; height: 22px; opacity: 0.3; margin-bottom: 4px; }
    .empty-section p { font-size: 11.5px; margin: 0; }
    .macros-stacked { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; min-height: 0; }
    .pie-wrapper { position: relative; width: 68px; height: 68px; flex-shrink: 0; }
    .pie-donut { width: 100%; height: 100%; border-radius: 50%; background: conic-gradient(from 0deg, #4fc3f7 0% var(--p-pct, 0%), #c8f135 var(--p-pct, 0%) var(--c-pct, 0%), #ff7043 var(--c-pct, 0%) var(--f-pct, 100%), rgba(255,255,255,0.04) var(--f-pct, 100%) 100%); }
    .pie-hole { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; border-radius: 50%; background: var(--bg-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .pie-cal { font-size: 12px; font-weight: 700; color: var(--text-primary); line-height: 1; }
    .pie-unit { font-size: 9px; color: var(--text-muted); line-height: 1; margin-top: 1px; }
    .pie-legend { display: flex; flex-direction: column; gap: 4px; align-items: center; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--text-muted); }
    .legend-item strong { color: var(--text-primary); }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .legend-dot.protein { background: #4fc3f7; }
    .legend-dot.carbs { background: #c8f135; }
    .legend-dot.fat { background: #ff7043; }
    .water-section { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; min-height: 0; }
    .water-visual { position: relative; flex-shrink: 0; }
    .water-ring { position: relative; width: 72px; height: 72px; }
    .water-ring svg { width: 100%; height: 100%; }
    .water-ring circle { transition: stroke-dashoffset 0.6s ease; }
    .water-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .water-amount { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .water-unit { font-size: 10px; color: var(--text-muted); }
    .water-quick-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; }
    .water-step-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; color: var(--text-muted); border: 1.5px solid rgba(255,255,255,0.15); border-radius: 50%; cursor: pointer; transition: all 0.15s ease; padding: 0; }
    .water-step-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: rgba(200,241,53,0.06); }
    .water-step-btn:disabled { opacity: 0.25; cursor: default; }
    .water-step-btn mat-icon { width: 15px; height: 15px; font-size: 15px; }
    .water-quick-btn { border-color: rgba(255,255,255,0.15) !important; color: var(--text-primary) !important; font-weight: 600; font-size: 10.5px; border-radius: 999px; min-width: 0; padding: 2px 10px; height: 26px; }
    .water-quick-btn:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
    .goal-met { font-size: 11px; font-weight: 700; color: var(--accent); }
    .prs-card { border-color: rgba(255,255,255,0.08); box-shadow: inset 0 0 0 1px rgba(200,241,53,0.05); }
    .pr-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: 8px; }
    .pr-icon { color: var(--accent); font-size: 16px; width: 16px; height: 16px; }
    .pr-details { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .pr-exercise { font-size: 12px; font-weight: 600; color: var(--text-primary); }
    .pr-stats { font-size: 10.5px; color: var(--text-muted); }
    .pr-1rm { font-size: 12px; font-weight: 700; color: var(--accent); }
    .spotify-card { position: relative; overflow: hidden; border-color: rgba(255,255,255,0.08); box-shadow: inset 0 0 0 1px rgba(29,185,84,0.04); }
    .spotify-card::before { content: ''; position: absolute; right: -54px; bottom: -98px; width: 172px; height: 172px; border-radius: 50%; background: radial-gradient(circle, rgba(29,185,84,0.12), rgba(29,185,84,0)); pointer-events: none; }
    .spotify-status-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 126px; height: 34px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(29,185,84,0.35); background: rgba(29,185,84,0.08); color: #dfffea; font-size: 11px; font-weight: 700; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; box-shadow: none; }
    .spotify-status-btn:hover { border-color: rgba(29,185,84,0.54); background: rgba(29,185,84,0.12); box-shadow: 0 8px 18px rgba(29,185,84,0.08); }
    .spotify-status-btn.connect { min-width: 142px; color: #06110a; background: var(--spotify-green); border-color: rgba(29,185,84,0.35); }
    .spotify-status-btn.connect:hover { background: #21c55d; color: #06110a; }
    .spotify-status-label-wrap { position: relative; display: inline-grid; place-items: center; min-width: 70px; }
    .spotify-status-label { grid-area: 1 / 1; white-space: nowrap; transition: opacity 0.15s ease; }
    .spotify-status-label-hover { opacity: 0; }
    .spotify-status-btn.connected:hover .spotify-status-label-default { opacity: 0; }
    .spotify-status-btn.connected:hover .spotify-status-label-hover { opacity: 1; }
    .spotify-connect { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 220px; padding: 18px 10px 10px; gap: 12px; text-align: center; }
    .spotify-logo { opacity: 0.95; transform: scale(0.9); filter: drop-shadow(0 10px 20px rgba(29,185,84,0.2)); }
    .spotify-desc { font-size: 12px; color: var(--text-muted); margin: 0; max-width: 300px; line-height: 1.55; }
    .spotify-connect-btn { border-color: transparent !important; background: var(--spotify-green) !important; color: #06110a !important; font-weight: 800; font-size: 12px; border-radius: 999px; box-shadow: none; min-height: 34px; padding: 0 18px; }
    .spotify-connect-btn:hover { background: #21c55d !important; }
    .spotify-player { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 10px 6px 6px; min-height: 220px; }
    .spotify-player-idle { gap: 14px; }
    .spotify-hero { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; max-width: 420px; }
    .album-art-image { width: 92px; height: 92px; border-radius: 18px; object-fit: cover; border: 1px solid rgba(29,185,84,0.18); box-shadow: 0 12px 24px rgba(0,0,0,0.24); }
    .album-art-placeholder { width: 92px; height: 92px; border-radius: 18px; background: radial-gradient(circle at top, rgba(29,185,84,0.22), rgba(29,185,84,0.08)); border: 1px solid rgba(29,185,84,0.18); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
    .album-art-placeholder mat-icon { color: var(--spotify-green); }
    .spotify-idle-placeholder { background: radial-gradient(circle at top, rgba(29,185,84,0.24), rgba(8,20,13,0.92)); box-shadow: 0 12px 24px rgba(0,0,0,0.22); }
    .track-label { font-size: 10px; color: var(--spotify-green); text-transform: uppercase; letter-spacing: 0.18em; font-weight: 700; }
    .track-name { font-size: 20px; line-height: 1.08; font-weight: 700; color: var(--text-primary); max-width: 360px; word-break: break-word; text-wrap: balance; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .track-meta { font-size: 12px; color: var(--text-muted); max-width: 360px; line-height: 1.45; text-wrap: balance; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .spotify-progress-row { width: 100%; max-width: 420px; display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; }
    .spotify-progress-track { position: relative; width: 100%; height: 6px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,0.08); box-shadow: inset 0 1px 2px rgba(0,0,0,0.32); }
    .spotify-progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--spotify-green) 0%, #53f28d 100%); transition: width 0.9s linear; }
    .spotify-time { font-size: 11px; color: rgba(255,255,255,0.62); font-variant-numeric: tabular-nums; }
    .spotify-controls-row { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
    .spotify-control-btn { position: relative; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(29,185,84,0.18); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.9); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; padding: 0; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
    .spotify-control-btn:hover:not(:disabled) { border-color: rgba(29,185,84,0.46); color: #d3ffe3; background: rgba(29,185,84,0.12); box-shadow: 0 8px 18px rgba(29,185,84,0.08); }
    .spotify-control-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .spotify-control-btn.primary { width: 50px; height: 50px; background: var(--spotify-green); color: #06110a; border-color: transparent; box-shadow: 0 10px 20px rgba(29,185,84,0.18); }
    .spotify-control-btn.primary:hover:not(:disabled) { background: #21c55d; color: #06110a; }
    .spotify-control-btn.active { border-color: rgba(29,185,84,0.52); color: #d2ffe3; background: rgba(29,185,84,0.14); }
    .spotify-control-btn.track-repeat { box-shadow: inset 0 0 0 1px rgba(141,255,187,0.2); }
    .spotify-repeat-indicator { position: absolute; right: 6px; bottom: 5px; min-width: 12px; height: 12px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 800; background: #8dffbb; color: #06110a; }
    .spotify-control-btn mat-icon { width: 16px; height: 16px; }
    .spotify-meta-row { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; max-width: 100%; }
    .spotify-meta-row-idle { gap: 10px; }
    .playback-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; background: rgba(29,185,84,0.14); color: #aaffc7; font-size: 10.5px; font-weight: 700; }
    .playback-badge.paused { background: rgba(255,255,255,0.06); color: var(--text-muted); }
    .device-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; background: rgba(255,255,255,0.05); color: var(--text-muted); font-size: 10.5px; font-weight: 600; }
    .spotify-mode-badge { color: #d9ffe7; background: rgba(29,185,84,0.12); }
    @keyframes slide-in-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    .ai-toast { position: fixed; bottom: 24px; right: 24px; width: 340px; max-width: calc(100vw - 48px); background: var(--bg-surface); border: 1px solid rgba(200,241,53,0.2); border-radius: 14px; padding: 16px; z-index: 1000; animation: slide-in-up 0.4s ease-out; box-shadow: 0 8px 32px rgba(0,0,0,0.4); transition: opacity 0.5s ease, transform 0.5s ease; }
    .ai-toast.fade-out { opacity: 0; transform: translateY(16px); }
    .ai-toast-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .ai-icon { width: 18px; height: 18px; color: var(--accent); flex-shrink: 0; }
    .ai-title { font-size: 13px; font-weight: 700; color: var(--accent); flex: 1; }
    .ai-close-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: var(--text-muted); border-radius: 50%; padding: 0; flex-shrink: 0; transition: background 0.15s, color 0.15s; }
    .ai-close-btn:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
    .ai-close-btn mat-icon { width: 16px; height: 16px; font-size: 16px; }
    .ai-toast-text { color: var(--text-muted); font-size: 13px; line-height: 1.5; margin: 0; }
    .ai-actions { margin-top: 10px; }
    .ai-chat-btn { border-color: var(--accent) !important; color: var(--accent) !important; font-size: 12px; font-weight: 600; border-radius: 8px; width: 100%; height: 32px; }
    .ai-chat-btn:hover { background: rgba(200,241,53,0.06) !important; }
    .ai-toast.minimized { width: auto; padding: 0; border-radius: 24px; }
    .ai-minimized-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; padding: 10px 14px; white-space: nowrap; }
    .ai-minimized-btn .expand-icon { width: 14px; height: 14px; transform: rotate(180deg); }
    .ai-minimized-btn:hover { background: rgba(200,241,53,0.04); border-radius: 24px; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
    .modal-panel.workout-modal { background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; }
    .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center; padding: 48px 24px; }
    .error-icon { width: 48px; height: 48px; color: #ff7043; margin-bottom: 16px; }
    .error-state h2 { color: var(--text-primary); font-size: 20px; font-weight: 600; margin: 0 0 8px; }
    .error-state p { color: var(--text-muted); font-size: 14px; margin: 0 0 24px; max-width: 360px; }
    .retry-btn { background: var(--accent) !important; color: #0d0d0d !important; font-weight: 600; border-radius: 10px; }
    @media (max-width: 1180px) {
      .page-header { align-items: stretch; }
      .quick-actions { width: 100%; display: flex; justify-content: flex-start; }
      .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .content-grid,
      .bottom-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 720px) {
      .page-header { flex-direction: column; }
      .quick-actions,
      .action-btn { width: 100%; }
      .date-display { min-width: 0; }
      .stats-grid { grid-template-columns: 1fr; }
      .spotify-status-btn { width: 100%; max-width: 220px; }
      .spotify-progress-row { gap: 8px; }
      .track-name { font-size: 18px; }
      .track-meta { font-size: 12px; }
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
  spotifyPlayback: SpotifyPlaybackState | null = null;
  spotifyDisplayProgressMs = 0;
  spotifyBusy = false;
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
    private readonly spotifyService: SpotifyService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => this.user = user);

    this.initializeSpotify();
    this.fetchDashboard();
  }

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

  retryLoad(): void {
    this.loading = true;
    this.loadError = false;
    this.fetchDashboard();
  }

  get dateStr(): string {
    const d = this.today;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  get spotifyArtistLine(): string {
    return this.spotifyTrack?.artistNames.join(', ') || 'Unknown artist';
  }

  get spotifyTrack(): SpotifyTrack | null {
    return this.spotifyPlayback?.track ?? null;
  }

  get spotifyDeviceLine(): string {
    if (this.spotifyPlayback?.deviceName) {
      return `Open on ${this.spotifyPlayback.deviceName}`;
    }
    return 'Open Spotify on one of your devices and start playing something.';
  }

  get spotifyTrackMetaLine(): string {
    if (!this.spotifyTrack) {
      return this.spotifyDeviceLine;
    }

    return this.spotifyTrack.albumName
      ? `${this.spotifyArtistLine} - ${this.spotifyTrack.albumName}`
      : this.spotifyArtistLine;
  }

  get spotifyProgressPercent(): number {
    const duration = this.spotifyTrack?.durationMs ?? 0;
    if (!duration) {
      return 0;
    }
    return Math.min((this.spotifyDisplayProgressMs / duration) * 100, 100);
  }

  get spotifyElapsedLabel(): string {
    return this.formatSpotifyTime(this.spotifyDisplayProgressMs);
  }

  get spotifyDurationLabel(): string {
    return this.formatSpotifyTime(this.spotifyTrack?.durationMs ?? 0);
  }

  get spotifyHasActiveDevice(): boolean {
    return !!(this.spotifyPlayback?.deviceId || this.spotifyPlayback?.deviceName);
  }

  get canToggleSpotifyShuffleControl(): boolean {
    return !!this.spotifyPlayback && (this.spotifyPlayback.canToggleShuffle || this.spotifyHasActiveDevice);
  }

  get canToggleSpotifyRepeatControl(): boolean {
    return !!this.spotifyPlayback && (this.spotifyPlayback.canToggleRepeat || this.spotifyHasActiveDevice);
  }

  get spotifyRepeatLabel(): string {
    switch (this.spotifyPlayback?.repeatMode) {
      case 'track':
        return 'Repeat Track';
      case 'context':
        return 'Repeat Queue';
      default:
        return 'Repeat Off';
    }
  }

  get canToggleSpotifyPlayback(): boolean {
    if (!this.spotifyPlayback) {
      return false;
    }
    return this.spotifyPlayback.isPlaying
      ? (this.spotifyPlayback.canPause || this.spotifyHasActiveDevice)
      : (this.spotifyPlayback.canResume || this.spotifyHasActiveDevice);
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
    return this.proteinPct + this.carbsRawPct;
  }

  get fatPct(): number {
    return this.carbsPct + this.fatRawPct;
  }

  quickAddWater(amountOz: number): void {
    this.addingWater = true;
    const dateStr = this.dateStr;

    if (amountOz < 0) {
      const currentOz = this.summary?.waterToday?.totalOz || 0;
      if (currentOz <= 0) {
        this.addingWater = false;
        return;
      }
      const removeAmount = Math.min(Math.abs(amountOz), currentOz);
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

  connectSpotify(): void {
    try {
      this.spotifyService.beginAuthorization();
    } catch (error: any) {
      this.snackBar.open(error?.message || 'Spotify is not configured yet.', 'Close', { duration: 4000 });
    }
  }

  disconnectSpotify(): void {
    this.spotifyService.disconnect();
    this.spotifyConnected = false;
    this.spotifyPlayback = null;
    this.spotifyDisplayProgressMs = 0;
    this.snackBar.open('Spotify disconnected.', 'Close', { duration: 2500 });
  }

  refreshSpotifyPlayback(showFeedback = true): void {
    if (!this.spotifyConnected) {
      return;
    }

    this.spotifyService.getPlaybackState()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(error => {
          this.handleSpotifyError(error, 'Could not refresh Spotify right now.');
          return of(null);
        }),
      )
      .subscribe(playback => {
        this.syncSpotifyPlayback(playback);
        if (showFeedback) {
          this.snackBar.open(
            playback?.track ? `Now showing ${playback.track.name}.` : 'Spotify connected, but nothing is playing right now.',
            'Close',
            { duration: 2500 },
          );
        }
      });
  }

  toggleSpotifyPlayback(): void {
    const previousPlayback = this.spotifyPlayback ? { ...this.spotifyPlayback } : null;
    this.runSpotifyCommand(
      this.spotifyService.togglePlayback(this.spotifyPlayback),
      "Could not change Spotify playback.",
      () => {
        if (!this.spotifyPlayback) {
          return;
        }
        this.spotifyPlayback = { ...this.spotifyPlayback, isPlaying: !this.spotifyPlayback.isPlaying };
      },
      () => this.syncSpotifyPlayback(previousPlayback),
    );
  }

  skipSpotifyNext(): void {
    this.runSpotifyCommand(this.spotifyService.nextTrack(this.spotifyPlayback?.deviceId ?? null), 'Could not skip to the next track.');
  }

  skipSpotifyPrevious(): void {
    this.runSpotifyCommand(this.spotifyService.previousTrack(this.spotifyPlayback?.deviceId ?? null), 'Could not go to the previous track.');
  }

  toggleSpotifyShuffle(): void {
    const nextShuffle = !this.spotifyPlayback?.shuffleEnabled;
    const previousPlayback = this.spotifyPlayback ? { ...this.spotifyPlayback } : null;
    this.runSpotifyCommand(
      this.spotifyService.setShuffle(nextShuffle, this.spotifyPlayback?.deviceId ?? null),
      "Could not update shuffle.",
      () => {
        if (!this.spotifyPlayback) {
          return;
        }
        this.spotifyPlayback = { ...this.spotifyPlayback, shuffleEnabled: nextShuffle };
      },
      () => this.syncSpotifyPlayback(previousPlayback),
    );
  }

  cycleSpotifyRepeatMode(): void {
    const currentMode = this.spotifyPlayback?.repeatMode ?? "off";
    const nextMode: SpotifyRepeatMode =
      currentMode === "off" ? "context" :
      currentMode === "context" ? "track" :
      "off";
    const previousPlayback = this.spotifyPlayback ? { ...this.spotifyPlayback } : null;
    this.runSpotifyCommand(
      this.spotifyService.setRepeatMode(nextMode, this.spotifyPlayback?.deviceId ?? null),
      "Could not update repeat mode.",
      () => {
        if (!this.spotifyPlayback) {
          return;
        }
        this.spotifyPlayback = { ...this.spotifyPlayback, repeatMode: nextMode };
      },
      () => this.syncSpotifyPlayback(previousPlayback),
    );
  }

  onAiHover(): void {
    this.aiHovered = true;
    if (this.aiAutoTimer) {
      clearTimeout(this.aiAutoTimer);
      this.aiAutoTimer = null;
    }
  }

  onAiLeave(): void {
    this.aiHovered = false;
  }

  openAiChat(): void {
    this.snackBar.open('AI chat coming soon. Stay tuned!', 'Close', { duration: 3000 });
  }

  dismissAiToast(): void {
    this.aiToastFading = true;
    setTimeout(() => {
      this.showAiToast = false;
      this.aiToastFading = false;
    }, 500);
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
            this.snackBar.open('Workout saved. Could not refresh dashboard. Pull to retry.', 'OK', { duration: 4000 });
          } else {
            this.loadError = true;
          }
        },
      });
  }

  private initializeSpotify(): void {
    const pendingAuthError = this.spotifyService.consumePendingAuthError();
    if (pendingAuthError) {
      this.snackBar.open(pendingAuthError, "Close", { duration: 4000 });
    }

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tickSpotifyProgress());

    this.spotifyConnected = this.spotifyService.isConnected();
    if (!this.spotifyConnected) {
      return;
    }

    timer(0, 15000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => {
          if (typeof document !== "undefined" && document.hidden) {
            return of(this.spotifyPlayback);
          }
          return this.spotifyService.getPlaybackState().pipe(
            catchError(error => this.handleSpotifyPollingError(error)),
          );
        }),
      )
      .subscribe(playback => {
        this.syncSpotifyPlayback(playback);
      });
  }

  private runSpotifyCommand(
    command$: Observable<void>,
    fallbackMessage: string,
    optimisticUpdate?: () => void,
    rollback?: () => void,
  ): void {
    if (this.spotifyBusy) {
      return;
    }

    optimisticUpdate?.();
    this.spotifyBusy = true;
    command$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.spotifyBusy = false;
          setTimeout(() => this.refreshSpotifyPlayback(false), 200);
        },
        error: error => {
          this.spotifyBusy = false;
          rollback?.();
          this.handleSpotifyError(error, fallbackMessage);
        },
      });
  }

  private handleSpotifyError(error: any, fallbackMessage: string): void {
    const message = error?.message || fallbackMessage;
    if (String(message).toLowerCase().includes("not connected") || String(message).toLowerCase().includes("expired")) {
      this.spotifyService.disconnect();
      this.spotifyConnected = false;
      this.spotifyPlayback = null;
      this.spotifyDisplayProgressMs = 0;
    }
    this.snackBar.open(message, "Close", { duration: 3500 });
  }

  private handleSpotifyPollingError(error: any): Observable<SpotifyPlaybackState | null> {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("not connected") || message.includes("expired")) {
      this.spotifyService.disconnect();
      this.spotifyConnected = false;
      this.spotifyPlayback = null;
      this.spotifyDisplayProgressMs = 0;
    }
    return of(this.spotifyPlayback);
  }

  private syncSpotifyPlayback(playback: SpotifyPlaybackState | null): void {
    this.spotifyPlayback = playback;
    this.spotifyDisplayProgressMs = playback?.progressMs ?? 0;
  }

  private tickSpotifyProgress(): void {
    if (!this.spotifyPlayback?.isPlaying || !this.spotifyTrack?.durationMs) {
      return;
    }
    this.spotifyDisplayProgressMs = Math.min(this.spotifyDisplayProgressMs + 1000, this.spotifyTrack.durationMs);
  }

  private formatSpotifyTime(valueMs: number): string {
    const totalSeconds = Math.max(Math.floor(valueMs / 1000), 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  private generateAiSuggestion(summary: DashboardSummary): void {
    const aiEnabled = localStorage.getItem('pref_aiSuggestions') !== 'false';
    if (!aiEnabled) return;

    if (summary.recentPRs.length > 0) {
      const pr = summary.recentPRs[0];
      const nextWeight = Math.round(pr.weightLbs * 1.05);
      this.aiSuggestion = `Based on your ${pr.exerciseName} PR of ${pr.weightLbs} lbs x ${pr.reps} reps, try ${nextWeight} lbs for ${Math.max(pr.reps - 1, 1)} reps next session. Progressive overload of about 5% is a strong next step.`;
    } else if (summary.streak.currentStreak >= 3) {
      this.aiSuggestion = `Great consistency with a ${summary.streak.currentStreak}-day streak. Consider adding 5-10 lbs to your compounds this week.`;
    } else if (summary.streak.totalWorkouts > 0) {
      this.aiSuggestion = `You've logged ${summary.streak.totalWorkouts} workout${summary.streak.totalWorkouts > 1 ? 's' : ''}. Keep building consistency and aim for at least 3 sessions per week.`;
    }

    if (this.aiSuggestion) {
      setTimeout(() => { this.showAiToast = true; }, 1500);
      this.aiAutoTimer = setTimeout(() => {
        if (!this.aiHovered) {
          this.dismissAiToast();
        }
      }, 15000);
    }
  }

  private get carbsRawPct(): number {
    const n = this.summary?.nutritionToday;
    if (!n) return 0;
    const total = (n.totalProteinG || 0) + (n.totalCarbsG || 0) + (n.totalFatG || 0);
    if (total <= 0) return 0;
    return ((n.totalCarbsG || 0) / total) * 100;
  }

  private get fatRawPct(): number {
    const n = this.summary?.nutritionToday;
    if (!n) return 0;
    const total = (n.totalProteinG || 0) + (n.totalCarbsG || 0) + (n.totalFatG || 0);
    if (total <= 0) return 0;
    return ((n.totalFatG || 0) / total) * 100;
  }
}


