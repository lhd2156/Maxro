import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NumericInputDirective } from '../../../shared/directives/numeric-input.directive';
import { WorkoutService } from '../../../core/services/workout.service';
import { ConfettiService } from '../../../core/services/confetti.service';
import { MUSCLE_GROUPS } from '../../../core/models/workout.model';

@Component({
  selector: 'app-workout-log',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule, NumericInputDirective,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Log Workout</h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-card class="form-card">
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="date">
              <mat-datepicker-toggle matSuffix [for]="picker"><mat-icon svgIcon="mx-calendar"></mat-icon></mat-datepicker-toggle>
              <mat-datepicker #picker />
            </mat-form-field>
            <mat-form-field appearance="outline" class="notes-field">
              <mat-label>Notes (optional)</mat-label>
              <input matInput formControlName="notes">
            </mat-form-field>
          </div>
        </mat-card>

        <div formArrayName="exercises">
          @for (exercise of exercisesArray.controls; track exercise; let i = $index) {
            <mat-card class="exercise-card" [formGroupName]="i">
              <div class="exercise-header">
                <h3>Exercise {{ i + 1 }}</h3>
                @if (exercisesArray.length > 1) {
                  <button mat-icon-button type="button" (click)="removeExercise(i)" class="remove-btn">
                    <mat-icon svgIcon="mx-x"></mat-icon>
                  </button>
                }
              </div>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Exercise Name</mat-label>
                  <input matInput formControlName="name" placeholder="e.g. Bench Press">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Muscle Group</mat-label>
                  <mat-select formControlName="muscleGroup">
                    @for (group of muscleGroups; track group) {
                      <mat-option [value]="group">{{ group }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              @if (getPopularForExercise(i).length > 0) {
                <div class="popular-exercises">
                  <span class="popular-label">Popular for this group:</span>
                  <div class="popular-chips">
                    @for (ex of getPopularForExercise(i); track ex) {
                      <button type="button" class="popular-chip" (click)="setExerciseName(i, ex)">{{ ex }}</button>
                    }
                  </div>
                </div>
              }

              <div class="sets-section" formArrayName="sets">
                <div class="sets-header">
                  <span class="set-col-num">Set</span>
                  <span class="set-col">Weight (lbs)</span>
                  <span class="set-col">Reps</span>
                  <span class="set-col-sm"></span>
                </div>
                @for (set of getSetsArray(i).controls; track set; let j = $index) {
                  <div class="set-row" [formGroupName]="j">
                    <span class="set-number">{{ j + 1 }}</span>
                    <div class="stepper-field">
                      <button type="button" class="step-btn" (click)="stepValue(i, j, 'weightLbs', -5)">-</button>
                      <input type="number" formControlName="weightLbs" class="stepper-input" placeholder="0" appNumericInput>
                      <button type="button" class="step-btn" (click)="stepValue(i, j, 'weightLbs', 5)">+</button>
                    </div>
                    <div class="stepper-field">
                      <button type="button" class="step-btn" (click)="stepValue(i, j, 'reps', -1)">-</button>
                      <input type="number" formControlName="reps" class="stepper-input" placeholder="0" appNumericInput>
                      <button type="button" class="step-btn" (click)="stepValue(i, j, 'reps', 1)">+</button>
                    </div>
                    @if (getSetsArray(i).length > 1) {
                      <button mat-icon-button type="button" (click)="removeSet(i, j)" class="remove-set-btn">
                        <mat-icon svgIcon="mx-minus-circle"></mat-icon>
                      </button>
                    } @else {
                      <div class="set-col-sm-spacer"></div>
                    }
                  </div>
                }
                <button mat-button type="button" (click)="addSet(i)" class="add-set-btn">
                  <mat-icon svgIcon="mx-plus"></mat-icon> Add Set
                </button>
              </div>
            </mat-card>
          }
        </div>

        <button mat-stroked-button type="button" (click)="addExercise()" class="add-exercise-btn">
          <mat-icon svgIcon="mx-plus"></mat-icon> Add Exercise
        </button>

        <div class="submit-section">
          <button mat-flat-button type="submit" class="submit-btn" [disabled]="loading || form.invalid">
            {{ loading ? 'Saving...' : 'Save Workout' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    h1 { color: var(--text-primary); font-size: 24px; font-weight: 700; margin: 0; }
    .form-card, .exercise-card {
      background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 20px; margin-bottom: 16px;
    }
    .form-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .form-row mat-form-field { flex: 1; min-width: 200px; }
    .notes-field { flex: 2 !important; }
    .exercise-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
    }
    .exercise-header h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .remove-btn { color: var(--text-muted); }
    .sets-section { margin-top: 8px; }
    .sets-header {
      display: flex; align-items: center; gap: 12px;
      padding: 0 4px 8px; font-size: 12px; font-weight: 600;
      color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;
    }
    .set-col-num { width: 32px; text-align: center; }
    .set-col { flex: 1; text-align: center; }
    .set-col-sm { width: 40px; }
    .set-row {
      display: flex; align-items: center; gap: 12px; margin-bottom: 8px;
    }
    .set-number {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 600; color: var(--text-muted);
      background: rgba(255,255,255,0.03); border-radius: 8px;
    }

    .stepper-field {
      flex: 1;
      display: flex;
      align-items: center;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      overflow: hidden;
      transition: border-color 0.15s;
    }
    .stepper-field:focus-within {
      border-color: var(--accent);
    }
    .step-btn {
      width: 40px; height: 44px;
      border: none; background: none;
      color: var(--accent);
      font-size: 18px; font-weight: 700;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .step-btn:hover { background: rgba(200,241,53,0.08); }
    .step-btn:active { background: rgba(200,241,53,0.15); }
    .stepper-input {
      flex: 1; min-width: 0;
      background: none; border: none; outline: none;
      color: var(--text-primary);
      font-size: 15px; font-weight: 600;
      text-align: center;
      font-family: inherit;
      padding: 8px 0;
    }

    .set-col-sm-spacer { width: 40px; }
    .remove-set-btn { color: var(--text-muted); }
    .add-set-btn {
      color: var(--accent) !important; font-size: 13px; font-weight: 600; margin-top: 4px;
    }
    .add-exercise-btn {
      width: 100%; border-color: rgba(200,241,53,0.3) !important;
      color: var(--accent) !important; font-weight: 600;
      border-radius: 10px; height: 48px; margin-bottom: 24px;
    }
    .submit-section { display: flex; justify-content: flex-end; }
    .submit-btn {
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; font-size: 15px; border-radius: 10px;
      height: 48px; min-width: 200px;
    }
    .submit-btn:disabled { opacity: 0.5; }

    .popular-exercises { margin-top: 8px; margin-bottom: 12px; }
    .popular-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px; }
    .popular-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .popular-chip {
      padding: 4px 10px; font-size: 12px; font-weight: 500;
      background: rgba(200,241,53,0.08); color: var(--accent);
      border: 1px solid rgba(200,241,53,0.25); border-radius: 16px;
      cursor: pointer; transition: all 0.15s;
    }
    .popular-chip:hover { background: rgba(200,241,53,0.15); border-color: var(--accent); }
  `],
})
export class WorkoutLogComponent {
  private readonly destroyRef = inject(DestroyRef);
  form: FormGroup;
  loading = false;
  muscleGroups = MUSCLE_GROUPS;
  popularExercisesByGroup: Record<string, string[]> = {};

  constructor(
    private readonly fb: FormBuilder,
    private readonly workoutService: WorkoutService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly confettiService: ConfettiService,
  ) {
    this.form = this.fb.group({
      date: [new Date(), Validators.required],
      notes: [''],
      exercises: this.fb.array([this.createExercise()]),
    });

    this.exercisesArray.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshPopularExercises());
  }

  getPopularForExercise(exerciseIndex: number): string[] {
    const muscleGroup = this.exercisesArray.at(exerciseIndex)?.get('muscleGroup')?.value;
    if (!muscleGroup) return [];
    return this.popularExercisesByGroup[muscleGroup] ?? [];
  }

  setExerciseName(exerciseIndex: number, name: string): void {
    this.exercisesArray.at(exerciseIndex).get('name')?.setValue(name);
  }

  private refreshPopularExercises(): void {
    const groups = new Set<string>();
    this.exercisesArray.controls.forEach(c => {
      const mg = c.get('muscleGroup')?.value;
      if (mg) groups.add(mg);
    });
    groups.forEach(mg => {
      if (!this.popularExercisesByGroup[mg]) {
        this.workoutService.getPopularExercises(mg)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(exercises => {
            this.popularExercisesByGroup = { ...this.popularExercisesByGroup, [mg]: exercises };
          });
      }
    });
  }

  get exercisesArray(): FormArray {
    return this.form.get('exercises') as FormArray;
  }

  getSetsArray(exerciseIndex: number): FormArray {
    return this.exercisesArray.at(exerciseIndex).get('sets') as FormArray;
  }

  createExercise(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      muscleGroup: ['', Validators.required],
      sets: this.fb.array([this.createSet()]),
    });
  }

  createSet(): FormGroup {
    return this.fb.group({
      weightLbs: [0, [Validators.required, Validators.min(0)]],
      reps: [0, [Validators.required, Validators.min(1)]],
    });
  }

  stepValue(exerciseIdx: number, setIdx: number, field: string, delta: number): void {
    const control = this.getSetsArray(exerciseIdx).at(setIdx).get(field) as AbstractControl;
    const current = control.value || 0;
    const next = Math.max(0, current + delta);
    control.setValue(next);
  }

  addExercise(): void { this.exercisesArray.push(this.createExercise()); }

  private sanitizeNumericFormValues(): void {
    this.exercisesArray.controls.forEach((_, i) => {
      this.getSetsArray(i).controls.forEach((set) => {
        const w = set.get('weightLbs');
        const r = set.get('reps');
        if (w?.value != null) w.setValue(this.normalizeInt(w.value));
        if (r?.value != null) r.setValue(this.normalizeInt(r.value));
      });
    });
  }

  private normalizeInt(val: any): number {
    const n = parseInt(String(val).replace(/[^0-9]/g, '') || '0', 10);
    return isNaN(n) ? 0 : n;
  }

  private toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  removeExercise(i: number): void { this.exercisesArray.removeAt(i); }
  addSet(i: number): void { this.getSetsArray(i).push(this.createSet()); }
  removeSet(i: number, j: number): void { this.getSetsArray(i).removeAt(j); }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.sanitizeNumericFormValues();
    this.loading = true;

    const raw = this.form.value;
    const dateVal: Date = raw.date;
    const input = {
      date: this.toLocalDateString(dateVal),
      notes: raw.notes || undefined,
      exercises: raw.exercises,
    };

    this.workoutService.logWorkout(input)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result.newPersonalRecords.length > 0) {
            const prNames = result.newPersonalRecords.map(pr => pr.exerciseName).join(', ');
            this.snackBar.open(`New PR on ${prNames}!`, 'Nice!', { duration: 5000 });
            this.confettiService.burst();
          } else {
            this.snackBar.open('Workout saved!', 'Close', { duration: 3000 });
          }
          this.router.navigate(['/workouts']);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Failed to save workout', 'Close', { duration: 4000 });
        },
      });
  }
}
