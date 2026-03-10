import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NumericInputDirective } from '../../directives/numeric-input.directive';
import { WorkoutService } from '../../../core/services/workout.service';
import { ConfettiService } from '../../../core/services/confetti.service';
import { MUSCLE_GROUPS } from '../../../core/models/workout.model';

@Component({
  selector: 'app-workout-quick-add',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <div class="quick-add-header">
      <h2>Log Workout</h2>
      <button mat-icon-button (click)="close()" aria-label="Close">
        <mat-icon svgIcon="mx-x"></mat-icon>
      </button>
    </div>
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
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

      <div formArrayName="exercises">
        @for (exercise of exercisesArray.controls; track exercise; let i = $index) {
          <div class="exercise-block" [formGroupName]="i">
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Muscle Group</mat-label>
                  <mat-select formControlName="muscleGroup">
                    @for (group of muscleGroups; track group) {
                      <mat-option [value]="group">{{ group }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Exercise</mat-label>
                  <input matInput formControlName="name" placeholder="e.g. Bench Press">
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
            <div class="sets-row" formArrayName="sets">
              @for (set of getSetsArray(i).controls; track set; let j = $index) {
                <div class="set-inline" [formGroupName]="j">
                  <span class="set-num">Set {{ j + 1 }}</span>
                  <input type="number" formControlName="weightLbs" placeholder="lbs" class="mini-input" appNumericInput>
                  <input type="number" formControlName="reps" placeholder="reps" class="mini-input" appNumericInput>
                </div>
              }
            </div>
            <button mat-button type="button" (click)="addSet(i)" class="add-set">+ Add Set</button>
          </div>
        }
      </div>
      <button mat-button type="button" (click)="addExercise()" class="add-ex">+ Add Exercise</button>

      <div class="actions">
        <button mat-button type="button" (click)="close()">Cancel</button>
        <button mat-flat-button type="submit" class="save-btn" [disabled]="loading || form.invalid">
          {{ loading ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .quick-add-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .quick-add-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .form-row { display: flex; gap: 12px; margin-bottom: 12px; }
    .form-row mat-form-field { flex: 1; }
    .notes-field { flex: 2 !important; }
    .exercise-block {
      background: rgba(255,255,255,0.02); border-radius: 8px;
      padding: 12px; margin-bottom: 12px;
    }
    .sets-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
    .set-inline { display: flex; align-items: center; gap: 6px; }
    .set-num { font-size: 12px; color: var(--text-muted); min-width: 40px; }
    .mini-input {
      width: 56px; padding: 6px 8px; font-size: 13px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px; color: var(--text-primary);
    }
    .add-set, .add-ex { color: var(--accent) !important; font-size: 12px; font-weight: 600; margin-bottom: 8px; }
    .popular-exercises { margin-top: 8px; margin-bottom: 8px; }
    .popular-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px; }
    .popular-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .popular-chip {
      padding: 4px 10px; font-size: 12px; font-weight: 500;
      background: rgba(200,241,53,0.08); color: var(--accent);
      border: 1px solid rgba(200,241,53,0.25); border-radius: 16px;
      cursor: pointer; transition: all 0.15s;
    }
    .popular-chip:hover { background: rgba(200,241,53,0.15); border-color: var(--accent); }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .save-btn { background: var(--accent) !important; color: #0D0D0D !important; font-weight: 600; }
  `],
})
export class WorkoutQuickAddComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly workoutService = inject(WorkoutService);
  private readonly confettiService = inject(ConfettiService);

  /** When provided (e.g. from dashboard), use this date instead of today for the workout. */
  @Input() initialDate?: Date;

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  loading = false;
  muscleGroups = MUSCLE_GROUPS;
  popularExercisesByGroup: Record<string, string[]> = {};

  constructor() {
    this.form = this.fb.group({
      date: [this.initialDate ?? new Date(), Validators.required],
      notes: [''],
      exercises: this.fb.array([this.createExercise()]),
    });
    this.exercisesArray.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshPopularExercises());
  }

  ngOnInit(): void {
    if (this.initialDate) {
      this.form.get('date')?.setValue(this.initialDate);
    }
  }

  getPopularForExercise(exerciseIndex: number): string[] {
    const muscleGroup = this.exercisesArray.at(exerciseIndex)?.get('muscleGroup')?.value;
    if (!muscleGroup) return [];
    const list = this.popularExercisesByGroup[muscleGroup] ?? [];
    return list.slice(0, 5);
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

  getSetsArray(i: number): FormArray {
    return this.exercisesArray.at(i).get('sets') as FormArray;
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

  addExercise(): void {
    this.exercisesArray.push(this.createExercise());
  }

  addSet(i: number): void {
    this.getSetsArray(i).push(this.createSet());
  }

  close(): void {
    this.cancelled.emit();
  }

  private sanitizeNumericFormValues(): void {
    this.exercisesArray.controls.forEach((ex, i) => {
      const sets = this.getSetsArray(i);
      sets.controls.forEach((set) => {
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

  onSubmit(): void {
    if (this.form.invalid) return;
    this.sanitizeNumericFormValues();
    this.loading = true;

    const raw = this.form.value;
    const dateVal: Date = raw.date;
    const input = {
      date: dateVal.toISOString().split('T')[0],
      notes: raw.notes || undefined,
      exercises: raw.exercises,
    };

    this.workoutService.logWorkout(input)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.loading = false;
          if (result.newPersonalRecords.length > 0) {
            this.confettiService.burst();
          }
          this.saved.emit();
        },
        error: () => {
          this.loading = false;
        },
      });
  }
}
