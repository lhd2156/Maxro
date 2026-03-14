import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { WorkoutService } from '../../../core/services/workout.service';
import { PersonalRecord } from '../../../core/models/workout.model';

@Component({
  selector: 'app-pr-tracker',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule,
    LoadingSpinnerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Personal Records</h1>
        <p class="subtitle">Your all-time bests across every exercise</p>
      </div>

      @if (loading) {
        <app-loading-spinner />
      } @else if (groupedPRs.length > 0) {
        <div class="pr-grid">
          @for (group of groupedPRs; track group.exercise) {
            <mat-card class="pr-card">
              <div class="pr-card-header">
                <mat-icon class="trophy" svgIcon="mx-trophy"></mat-icon>
                <h3>{{ group.exercise }}</h3>
              </div>
              <div class="pr-stats">
                <div class="pr-stat">
                  <span class="pr-value">{{ formatPRPrimaryValue(group.best) }}</span>
                  <span class="pr-label">{{ formatPRPrimaryLabel(group.best) }}</span>
                </div>
                <div class="pr-divider"></div>
                <div class="pr-stat">
                  <span class="pr-value">{{ group.best.reps }}</span>
                  <span class="pr-label">reps</span>
                </div>
                <div class="pr-divider"></div>
                <div class="pr-stat">
                  <span class="pr-value accent">{{ group.best.oneRepMaxLbs | number:'1.0-0' }}</span>
                  <span class="pr-label">{{ formatPRScoreLabel(group.best) }}</span>
                </div>
              </div>
              <span class="pr-date">{{ displayPRDate(group.best) | date:'mediumDate' }}</span>
            </mat-card>
          }
        </div>
      } @else {
        <app-empty-state
          svgIcon="mx-trophy"
          title="No PRs yet"
          message="Start logging workouts to automatically track your personal records." />
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
    .page {
      max-width: 1000px;
      height: 100%;
      min-height: 0;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .page-header { margin-bottom: 28px; flex-shrink: 0; }
    h1 { color: var(--text-primary); font-size: 24px; font-weight: 700; margin: 0; }
    .subtitle { color: var(--text-muted); font-size: 14px; margin: 4px 0 0; }
    .page > app-loading-spinner,
    .page > app-empty-state {
      display: block;
      flex: 1 1 auto;
      min-height: 0;
    }
    .pr-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding-right: 4px;
      align-content: start;
    }
    .pr-card {
      background: var(--bg-surface);
      border: 1px solid rgba(200,241,53,0.15);
      border-radius: 12px; padding: 20px;
      transition: border-color 0.2s;
    }
    .pr-card:hover { border-color: rgba(200,241,53,0.3); }
    .pr-card-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
    }
    .trophy { color: var(--accent); font-size: 22px; width: 22px; height: 22px; }
    .pr-card-header h3 {
      font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0;
    }
    .pr-stats {
      display: flex; align-items: center; gap: 16px; margin-bottom: 12px;
    }
    .pr-stat { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .pr-value { font-size: 24px; font-weight: 700; color: var(--text-primary); }
    .pr-value.accent { color: var(--accent); }
    .pr-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .pr-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.08); }
    .pr-date { font-size: 12px; color: var(--text-muted); }
  `],
})
export class PrTrackerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  groupedPRs: { exercise: string; best: PersonalRecord }[] = [];
  loading = true;

  constructor(private readonly workoutService: WorkoutService) {}

  ngOnInit(): void {
    this.workoutService.getPersonalRecords()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: prs => {
          this.groupedPRs = this.groupByExercise(prs);
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
  }

  private groupByExercise(prs: PersonalRecord[]): { exercise: string; best: PersonalRecord }[] {
    const map = new Map<string, PersonalRecord>();
    for (const pr of prs) {
      const existing = map.get(pr.exerciseName);
      if (!existing || pr.oneRepMaxLbs > existing.oneRepMaxLbs) {
        map.set(pr.exerciseName, pr);
      }
    }
    return Array.from(map.entries())
      .map(([exercise, best]) => ({ exercise, best }))
      .sort((a, b) => a.exercise.localeCompare(b.exercise));
  }

  formatPRPrimaryValue(pr: PersonalRecord): string {
    return this.isBodyweightPR(pr) ? 'Body' : String(pr.weightLbs);
  }

  formatPRPrimaryLabel(pr: PersonalRecord): string {
    return this.isBodyweightPR(pr) ? 'weight' : 'lbs';
  }

  formatPRScoreLabel(pr: PersonalRecord): string {
    return this.isBodyweightPR(pr) ? 'rep PR' : 'est 1RM';
  }

  displayPRDate(pr: PersonalRecord): string {
    return pr.workoutDate || pr.achievedAt;
  }

  private isBodyweightPR(pr: PersonalRecord): boolean {
    return pr.weightLbs <= 0;
  }
}