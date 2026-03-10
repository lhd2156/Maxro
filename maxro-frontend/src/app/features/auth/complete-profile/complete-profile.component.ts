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
              <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" [max]="maxDate" readonly (click)="dobPicker.open()">
              <mat-datepicker-toggle matSuffix [for]="dobPicker"><mat-icon svgIcon="mx-calendar"></mat-icon></mat-datepicker-toggle>
              <mat-datepicker #dobPicker startView="multi-year" [startAt]="startDate"></mat-datepicker>
              @if (isFieldInvalid('dateOfBirth')) {
                <mat-error>Date of birth is required</mat-error>
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
                <mat-error>Gender is required</mat-error>
              }
            </mat-form-field>

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
      agreedToTerms: [false, Validators.requiredTrue],
    });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.touched || this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
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
      agreedToTerms: true,
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.authService.updateCurrentUser(user);
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Failed to save profile', 'Close', { duration: 3000 });
        },
      });
  }
}
