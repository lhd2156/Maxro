import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Profile</h1>
      </div>

      @if (user) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-card class="section-card">
            <h3>Personal Info</h3>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput [value]="user.email" disabled>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Body Weight (lbs)</mat-label>
                <input matInput type="number" formControlName="bodyWeightLbs">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Height (inches)</mat-label>
                <input matInput type="number" formControlName="heightInches">
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Fitness Goal</mat-label>
                <mat-select formControlName="fitnessGoal">
                  @for (goal of fitnessGoals; track goal) {
                    <mat-option [value]="goal">{{ goal }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </mat-card>

          <mat-card class="section-card">
            <h3>Daily Macro Targets</h3>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Calories (kcal)</mat-label>
                <input matInput type="number" formControlName="dailyCalorieTarget">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Protein (g)</mat-label>
                <input matInput type="number" formControlName="dailyProteinTarget">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Carbs (g)</mat-label>
                <input matInput type="number" formControlName="dailyCarbTarget">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fat (g)</mat-label>
                <input matInput type="number" formControlName="dailyFatTarget">
              </mat-form-field>
            </div>
          </mat-card>

          <mat-card class="section-card">
            <h3>Hydration</h3>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Daily Water Goal (oz)</mat-label>
                <input matInput type="number" formControlName="dailyWaterGoalOz">
              </mat-form-field>
            </div>
          </mat-card>

          <div class="submit-section">
            <button mat-flat-button type="submit" class="submit-btn" [disabled]="saving || form.invalid || form.pristine">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 700px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    h1 { color: var(--text-primary); font-size: 24px; font-weight: 700; margin: 0; }
    .section-card {
      background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 24px; margin-bottom: 16px;
    }
    h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px; }
    .form-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0 16px;
    }
    .full-width { grid-column: 1 / -1; }
    .submit-section { display: flex; justify-content: flex-end; margin-top: 8px; }
    .submit-btn {
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; font-size: 15px; border-radius: 10px;
      height: 48px; min-width: 180px;
    }
    .submit-btn:disabled { opacity: 0.5; }
  `],
})
export class UserProfileComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  form!: FormGroup;
  user: UserProfile | null = null;
  saving = false;

  readonly fitnessGoals = [
    'Lose Weight', 'Build Muscle', 'Maintain Weight',
    'Increase Strength', 'Improve Endurance', 'General Fitness',
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        if (user) {
          this.user = user;
          this.initForm(user);
        }
      });
  }

  onSubmit(): void {
    if (this.form.invalid || this.form.pristine) return;
    this.saving = true;

    const input = this.form.value;
    this.userService.updateProfile(input)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.form.markAsPristine();
          this.snackBar.open('Profile updated', 'Close', { duration: 3000 });
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('Failed to update profile', 'Close', { duration: 3000 });
        },
      });
  }

  private initForm(user: UserProfile): void {
    this.form = this.fb.group({
      firstName: [user.firstName ?? '', [Validators.required, Validators.minLength(1)]],
      lastName: [user.lastName ?? '', [Validators.required, Validators.minLength(1)]],
      bodyWeightLbs: [user.bodyWeightLbs],
      heightInches: [user.heightInches],
      fitnessGoal: [user.fitnessGoal],
      dailyCalorieTarget: [user.dailyCalorieTarget, [Validators.min(500)]],
      dailyProteinTarget: [user.dailyProteinTarget, [Validators.min(10)]],
      dailyCarbTarget: [user.dailyCarbTarget, [Validators.min(10)]],
      dailyFatTarget: [user.dailyFatTarget, [Validators.min(10)]],
      dailyWaterGoalOz: [user.dailyWaterGoalOz, [Validators.min(8)]],
    });
  }
}
