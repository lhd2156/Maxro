import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatCheckboxModule, MatIconModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <div class="auth-page">
      <div class="bg-grid">
        @for (i of gridDots; track i) {
          <div class="grid-dot" [style.animation-delay]="i * 0.15 + 's'"></div>
        }
      </div>
      <div class="auth-container fade-in">
        <div class="brand">
          <span class="brand-text">MAXRO</span>
          <p class="brand-tagline">Just a few more details to get you started</p>
        </div>
        <mat-card class="auth-card slide-up">
          <h2>Complete Your Profile</h2>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('dateOfBirth')">
              <mat-label>Date of Birth</mat-label>
              <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" [max]="maxDate" placeholder="MM/DD/YYYY" autocomplete="bday" (input)="onDobInput($event)">
              <mat-datepicker-toggle matSuffix [for]="dobPicker"><mat-icon svgIcon="mx-calendar"></mat-icon></mat-datepicker-toggle>
              <mat-datepicker #dobPicker startView="multi-year" [startAt]="startDate"></mat-datepicker>
              @if (isFieldInvalid('dateOfBirth')) {
                <mat-error>{{ fieldErrorMessage('dateOfBirth') }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('gender')">
              <mat-label>Gender</mat-label>
              <mat-select formControlName="gender">
                <mat-option value="Male">Male</mat-option>
                <mat-option value="Female">Female</mat-option>
                <mat-option value="Non-binary">Non-binary</mat-option>
                <mat-option value="Prefer not to say">Prefer not to say</mat-option>
              </mat-select>
              @if (isFieldInvalid('gender')) {
                <mat-error>{{ fieldErrorMessage('gender') }}</mat-error>
              }
            </mat-form-field>

            <div class="goals-section">
              <div class="goals-header">
                <p class="goals-label">Nutrition Targets</p>
                <span class="goals-helper">Optional</span>
              </div>
              <p class="goals-note">Set realistic targets. You can always adjust these later in Settings.</p>
              @if (showNutritionRangeWarning) {
                <p class="goals-warning">Please set realistic nutrition targets within the allowed ranges.</p>
              }
              <div class="goals-grid">
                <mat-form-field appearance="outline" class="goal-field" [class.field-error]="isFieldInvalid('dailyCalorieTarget')">
                  <mat-label>Daily Calories</mat-label>
                  <input matInput formControlName="dailyCalorieTarget" type="number" min="1" max="10000" step="1">
                  <span matSuffix>kcal</span>
                </mat-form-field>

                <mat-form-field appearance="outline" class="goal-field" [class.field-error]="isFieldInvalid('dailyProteinTarget')">
                  <mat-label>Protein</mat-label>
                  <input matInput formControlName="dailyProteinTarget" type="number" min="10" max="500" step="1">
                  <span matSuffix>g</span>
                </mat-form-field>

                <mat-form-field appearance="outline" class="goal-field" [class.field-error]="isFieldInvalid('dailyCarbTarget')">
                  <mat-label>Carbs</mat-label>
                  <input matInput formControlName="dailyCarbTarget" type="number" min="10" max="1000" step="1">
                  <span matSuffix>g</span>
                </mat-form-field>

                <mat-form-field appearance="outline" class="goal-field" [class.field-error]="isFieldInvalid('dailyFatTarget')">
                  <mat-label>Fat</mat-label>
                  <input matInput formControlName="dailyFatTarget" type="number" min="10" max="500" step="1">
                  <span matSuffix>g</span>
                </mat-form-field>

                <mat-form-field appearance="outline" class="goal-field goal-field-wide" [class.field-error]="isFieldInvalid('dailyWaterGoalOz')">
                  <mat-label>Daily Water Goal</mat-label>
                  <input matInput formControlName="dailyWaterGoalOz" type="number" min="8" max="300" step="1">
                  <span matSuffix>oz</span>
                </mat-form-field>
              </div>
            </div>

            <div class="terms-row" [class.terms-invalid]="isFieldInvalid('agreedToTerms')">
              <mat-checkbox formControlName="agreedToTerms" color="primary">
                I agree to the <a routerLink="/terms" target="_blank" class="terms-link">Terms of Service</a> and <a routerLink="/privacy" target="_blank" class="terms-link">Privacy Policy</a>
              </mat-checkbox>
              @if (isFieldInvalid('agreedToTerms')) {
                <span class="terms-error">You must agree to continue</span>
              }
            </div>

            <button mat-flat-button class="submit-btn" type="submit" [disabled]="loading">
              {{ loading ? 'Saving...' : 'Get Started' }}
            </button>
          </form>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse-dot { 0%, 100% { opacity: 0.03; } 50% { opacity: 0.12; } }

    .auth-page {
      min-height: 100vh; background: var(--bg-primary);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; position: relative; overflow: hidden;
    }
    .bg-grid {
      position: absolute; inset: 0;
      display: grid; grid-template-columns: repeat(12, 1fr); grid-template-rows: repeat(8, 1fr);
      gap: 32px; padding: 32px; pointer-events: none;
    }
    .grid-dot {
      width: 4px; height: 4px; border-radius: 50%;
      background: var(--accent); opacity: 0.03;
      justify-self: center; align-self: center;
      animation: pulse-dot 4s ease-in-out infinite;
    }
    .fade-in { animation: fade-in 0.6s ease-out; }
    .slide-up { animation: slide-up 0.5s ease-out 0.2s both; }

    .auth-container { width: 100%; max-width: 420px; position: relative; z-index: 1; }
    .brand { text-align: center; margin-bottom: 32px; }
    .brand-text { font-size: 36px; font-weight: 800; letter-spacing: 6px; color: var(--accent); }
    .brand-tagline { color: var(--text-muted); font-size: 14px; margin-top: 8px; }
    .auth-card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px; padding: 32px;
    }
    h2 { color: var(--text-primary); font-size: 22px; font-weight: 700; margin: 0 0 24px; }

    form { display: flex; flex-direction: column; gap: 4px; }
    mat-form-field { width: 100%; }

    .goals-section { margin-top: 4px; }
    .goals-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 0 8px;
    }
    .goals-label { margin: 0; font-size: 13px; color: var(--text-primary); font-weight: 600; }
    .goals-helper { font-size: 11px; color: var(--text-muted); }
    .goals-note { margin: 0 0 10px; font-size: 12px; color: var(--text-muted); line-height: 1.4; }
    .goals-warning { margin: 0 0 10px; font-size: 12px; color: #ff5252; line-height: 1.4; font-weight: 600; }
    .goals-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .goal-field-wide { grid-column: 1 / -1; }

    .terms-row { margin: 8px 0 16px; }
    .terms-row mat-checkbox { font-size: 13px; color: var(--text-muted); }
    .terms-link { color: var(--accent); text-decoration: none; font-weight: 600; }
    .terms-link:hover { text-decoration: underline; }
    .terms-error { display: block; font-size: 12px; color: #ff5252; margin-top: 4px; }
    .terms-invalid mat-checkbox { color: #ff5252 !important; }

    .submit-btn {
      width: 100%; height: 48px;
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; font-size: 15px; border-radius: 10px; margin-top: 4px;
    }
    .submit-btn:disabled { opacity: 0.5; }

    @media (max-width: 560px) {
      .goals-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class CompleteProfileComponent {
  private readonly destroyRef = inject(DestroyRef);
  form: FormGroup;
  loading = false;
  submitted = false;
  gridDots = Array.from({ length: 96 }, (_, i) => i);

  maxDate = new Date();
  startDate = new Date(2000, 0, 1);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      dateOfBirth: [null, Validators.required],
      gender: ['', Validators.required],
      dailyCalorieTarget: [2000, [Validators.min(1), Validators.max(10000)]],
      dailyProteinTarget: [150, [Validators.min(10), Validators.max(500)]],
      dailyCarbTarget: [250, [Validators.min(10), Validators.max(1000)]],
      dailyFatTarget: [65, [Validators.min(10), Validators.max(500)]],
      dailyWaterGoalOz: [64, [Validators.min(8), Validators.max(300)]],
      agreedToTerms: [false, Validators.requiredTrue],
    });

    Object.keys(this.form.controls).forEach(key => {
      this.form.controls[key].valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.clearServerError(key));
    });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.touched || this.submitted);
  }

  get showNutritionRangeWarning(): boolean {
    const nutritionFields = [
      'dailyCalorieTarget',
      'dailyProteinTarget',
      'dailyCarbTarget',
      'dailyFatTarget',
      'dailyWaterGoalOz',
    ];

    return nutritionFields.some(field => this.isFieldInvalid(field));
  }

  fieldErrorMessage(field: string): string {
    const control = this.form.controls[field];
    if (!this.isFieldInvalid(field)) {
      return '';
    }

    if (control.hasError('serverError')) {
      return control.getError('serverError');
    }

    if (field === 'dateOfBirth') {
      if (control.hasError('required')) {
        return 'Date of birth is required';
      }
      if (control.hasError('matDatepickerParse')) {
        return 'Enter a valid date';
      }
      if (control.hasError('matDatepickerMax')) {
        return 'Date of birth cannot be in the future';
      }
    }

    if (field === 'gender' && control.hasError('required')) {
      return 'Gender is required';
    }

    if (field === 'dailyCalorieTarget') {
      if (control.hasError('min')) return 'Daily calories must be at least 1 kcal';
      if (control.hasError('max')) return 'Daily calories must be at most 10000 kcal';
    }

    if (field === 'dailyProteinTarget') {
      if (control.hasError('min')) return 'Protein target must be at least 10 g';
      if (control.hasError('max')) return 'Protein target must be at most 500 g';
    }

    if (field === 'dailyCarbTarget') {
      if (control.hasError('min')) return 'Carb target must be at least 10 g';
      if (control.hasError('max')) return 'Carb target must be at most 1000 g';
    }

    if (field === 'dailyFatTarget') {
      if (control.hasError('min')) return 'Fat target must be at least 10 g';
      if (control.hasError('max')) return 'Fat target must be at most 500 g';
    }

    if (field === 'dailyWaterGoalOz') {
      if (control.hasError('min')) return 'Water target must be at least 8 oz';
      if (control.hasError('max')) return 'Water target must be at most 300 oz';
    }

    return 'This field is required';
  }

  onSubmit(): void {
    this.submitted = true;
    this.clearAllServerErrors();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const v = this.form.value;
    const dob = v.dateOfBirth instanceof Date
      ? v.dateOfBirth.toISOString().split('T')[0]
      : v.dateOfBirth;

    this.userService.updateProfile({
      dateOfBirth: dob,
      gender: v.gender,
      dailyCalorieTarget: this.toOptionalInteger(v.dailyCalorieTarget),
      dailyProteinTarget: this.toOptionalInteger(v.dailyProteinTarget),
      dailyCarbTarget: this.toOptionalInteger(v.dailyCarbTarget),
      dailyFatTarget: this.toOptionalInteger(v.dailyFatTarget),
      dailyWaterGoalOz: this.toOptionalNumber(v.dailyWaterGoalOz),
      agreedToTerms: true,
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.authService.updateCurrentUser(user);
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.loading = false;
          const mapped = this.applyServerValidationErrors(error);
          const message = mapped
            ? 'Please fix the highlighted fields.'
            : this.extractFriendlyMessage(error, 'Failed to save profile');
          this.snackBar.open(message, 'Close', { duration: 3500 });
        },
      });
  }

  onDobInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalized = this.normalizeCompactDateInput(input.value);
    if (!normalized) {
      return;
    }

    const date = this.parseUsDate(normalized);
    if (date) {
      this.form.controls['dateOfBirth'].setValue(date);
      input.value = normalized;
      this.form.controls['dateOfBirth'].markAsDirty();
      this.form.controls['dateOfBirth'].updateValueAndValidity();
    }
  }

  private normalizeCompactDateInput(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) {
      return null;
    }

    const month = digits.slice(0, 2);
    const day = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    return `${month}/${day}/${year}`;
  }

  private parseUsDate(value: string): Date | null {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      return null;
    }

    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    const isValid = parsed.getFullYear() === year
      && parsed.getMonth() === month - 1
      && parsed.getDate() === day;

    return isValid ? parsed : null;
  }

  private toOptionalInteger(value: unknown): number | undefined {
    const parsed = this.toOptionalNumber(value);
    return parsed === undefined ? undefined : Math.round(parsed);
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private applyServerValidationErrors(error: any): boolean {
    const fieldMap: Record<string, string> = {
      dateOfBirth: 'dateOfBirth',
      gender: 'gender',
      dailyCalorieTarget: 'dailyCalorieTarget',
      dailyProteinTarget: 'dailyProteinTarget',
      dailyCarbTarget: 'dailyCarbTarget',
      dailyFatTarget: 'dailyFatTarget',
      dailyWaterGoalOz: 'dailyWaterGoalOz',
      agreedToTerms: 'agreedToTerms',
    };

    let applied = false;
    const messages = this.collectErrorMessages(error);
    for (const part of messages) {
      const [rawPath, ...rest] = part.split(':');
      if (!rawPath || rest.length === 0) {
        continue;
      }

      const fieldToken = rawPath.trim().split('.').pop() ?? '';
      const controlName = fieldMap[fieldToken];
      const message = rest.join(':').trim();
      if (!controlName || !message) {
        continue;
      }

      const control = this.form.controls[controlName];
      if (!control) {
        continue;
      }
      control.setErrors({ ...(control.errors || {}), serverError: message });
      control.markAsTouched();
      applied = true;
    }

    return applied;
  }

  private extractFriendlyMessage(error: any, fallback: string): string {
    const messages = this.collectErrorMessages(error);
    if (!messages.length) {
      return fallback;
    }
    return messages
      .map(part => part.replace(/^[A-Za-z0-9_.]+:\s*/, '').trim())
      .filter(Boolean)
      .join('; ') || fallback;
  }

  private collectErrorMessages(error: any): string[] {
    const fromGraphQl = Array.isArray(error?.graphQLErrors)
      ? error.graphQLErrors.map((entry: any) => entry?.message).filter(Boolean)
      : [];
    const message = typeof error?.message === 'string' ? [error.message] : [];
    return [...fromGraphQl, ...message]
      .flatMap((entry: string) => entry.split(';'))
      .map((entry: string) => entry.trim())
      .filter(Boolean);
  }

  private clearServerError(controlName: string): void {
    const control = this.form.controls[controlName];
    if (!control?.hasError('serverError')) {
      return;
    }
    const { serverError, ...rest } = control.errors || {};
    control.setErrors(Object.keys(rest).length ? rest : null);
  }

  private clearAllServerErrors(): void {
    Object.keys(this.form.controls).forEach(key => this.clearServerError(key));
  }
}


