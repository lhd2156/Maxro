import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { WorkoutService } from '../../../core/services/workout.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { Workout, WorkoutPage } from '../../../core/models/workout.model';

@Component({
  selector: 'app-workout-history',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatPaginatorModule, MatSnackBarModule,
    LoadingSpinnerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Workout History</h1>
        <a mat-flat-button routerLink="/workouts/log" class="action-btn">
          <mat-icon svgIcon="mx-plus"></mat-icon> Log Workout
        </a>
      </div>

      @if (loading) {
        <app-loading-spinner />
      } @else if (workoutPage && workoutPage.content.length > 0) {
        <div class="workout-list">
          @for (workout of workoutPage.content; track workout.id) {
            <mat-card class="workout-card">
              <div class="workout-header">
                <div>
                  <span class="workout-date">{{ workout.date }}</span>
                  @if (workout.notes) {
                    <span class="workout-notes">{{ workout.notes }}</span>
                  }
                </div>
                <button mat-icon-button (click)="deleteWorkout(workout)" class="delete-btn">
                  <mat-icon svgIcon="mx-trash"></mat-icon>
                </button>
              </div>
              <div class="exercises">
                @for (ex of workout.exercises; track ex.name) {
                  <div class="exercise-chip-row">
                    <mat-chip-set>
                      <mat-chip class="muscle-chip">{{ ex.muscleGroup }}</mat-chip>
                    </mat-chip-set>
                    <span class="ex-name">{{ ex.name }}</span>
                    <span class="ex-detail">
                      {{ ex.sets.length }} sets &middot;
                      {{ getMaxWeight(ex) }} lbs max
                    </span>
                  </div>
                }
              </div>
            </mat-card>
          }
        </div>

        @if (workoutPage.totalPages > 1) {
          <mat-paginator
            [length]="workoutPage.totalElements"
            [pageSize]="pageSize"
            [pageIndex]="currentPage"
            (page)="onPageChange($event)"
            [hidePageSize]="true" />
        }
      } @else {
        <app-empty-state
          svgIcon="mx-dumbbell"
          title="No workouts yet"
          message="Log your first workout to start tracking your progress." />
      }
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px;
    }
    h1 { color: var(--text-primary); font-size: 24px; font-weight: 700; margin: 0; }
    .action-btn {
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 600; border-radius: 10px;
    }
    .workout-list { display: flex; flex-direction: column; gap: 12px; }
    .workout-card {
      background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 20px;
    }
    .workout-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 12px;
    }
    .workout-date {
      font-size: 15px; font-weight: 600; color: var(--text-primary); display: block;
    }
    .workout-notes {
      font-size: 13px; color: var(--text-muted); display: block; margin-top: 2px;
    }
    .delete-btn { color: var(--text-muted); }
    .delete-btn:hover { color: #ff5252; }
    .exercises { display: flex; flex-direction: column; gap: 8px; }
    .exercise-chip-row {
      display: flex; align-items: center; gap: 12px;
    }
    .muscle-chip {
      font-size: 11px !important; font-weight: 600;
    }
    .ex-name {
      font-size: 14px; font-weight: 500; color: var(--text-primary); flex: 1;
    }
    .ex-detail { font-size: 13px; color: var(--text-muted); }
  `],
})
export class WorkoutHistoryComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  workoutPage: WorkoutPage | null = null;
  loading = true;
  currentPage = 0;
  pageSize = 20;

  constructor(
    private readonly workoutService: WorkoutService,
    private readonly analyticsService: AnalyticsService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadWorkouts();
    this.workoutService.workoutSaved$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadWorkouts());
  }

  loadWorkouts(): void {
    this.loading = true;
    this.workoutService.getWorkouts(this.currentPage, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          if (page.content && page.content.length > 0) {
            this.workoutPage = page;
            this.currentPage = page.currentPage ?? 0;
            this.loading = false;
          } else {
            this.tryDashboardFallback();
          }
        },
        error: () => this.tryDashboardFallback(),
      });
  }

  private tryDashboardFallback(): void {
    const today = new Date().toISOString().split('T')[0];
    this.analyticsService.getDashboardSummary(today)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: summary => {
          if (summary.workoutToday) {
            this.workoutPage = {
              content: [summary.workoutToday],
              totalElements: 1,
              totalPages: 1,
              currentPage: 0,
            };
          } else {
            this.workoutPage = { content: [], totalElements: 0, totalPages: 0, currentPage: 0 };
          }
          this.loading = false;
        },
        error: () => {
          this.workoutPage = { content: [], totalElements: 0, totalPages: 0, currentPage: 0 };
          this.loading = false;
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.loadWorkouts();
  }

  deleteWorkout(workout: Workout): void {
    this.workoutService.deleteWorkout(workout.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Workout deleted', 'Close', { duration: 3000 });
          this.loadWorkouts();
        },
        error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 3000 }),
      });
  }

  getMaxWeight(exercise: { sets: { weightLbs: number }[] }): number {
    return Math.max(...exercise.sets.map(s => s.weightLbs));
  }
}
