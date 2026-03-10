import { Component, DestroyRef, AfterViewInit, inject, NgZone } from '@angular/core';
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
import { switchMap, catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
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
          <a routerLink="/" class="brand-link"><span class="brand-text">MAXRO</span></a>
          <p class="brand-tagline">Track. Lift. Fuel. Repeat.</p>
        </div>
        <mat-card class="auth-card slide-up">
          <div class="auth-card-header">
            <h2>Create Account</h2>
            <p class="auth-subtitle">Sign up to start tracking your fitness</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('firstName')" class="auth-field">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="firstName" autocomplete="given-name">
            </mat-form-field>

            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('lastName')" class="auth-field">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="lastName" autocomplete="family-name">
            </mat-form-field>

            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('email')" class="auth-field">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email">
            </mat-form-field>

            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('password')" class="auth-field">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" autocomplete="new-password">
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon [svgIcon]="hidePassword ? 'mx-eye-off' : 'mx-eye'"></mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('dateOfBirth')" class="auth-field">
              <mat-label>Date of Birth</mat-label>
              <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" [max]="maxDate" readonly (click)="dobPicker.open()">
              <mat-datepicker-toggle matSuffix [for]="dobPicker"><mat-icon svgIcon="mx-calendar"></mat-icon></mat-datepicker-toggle>
              <mat-datepicker #dobPicker startView="multi-year" [startAt]="startDate"></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('gender')" class="auth-field">
              <mat-label>Gender</mat-label>
              <mat-select formControlName="gender">
                <mat-option value="Male">Male</mat-option>
                <mat-option value="Female">Female</mat-option>
                <mat-option value="Non-binary">Non-binary</mat-option>
                <mat-option value="Prefer not to say">Prefer not to say</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="goals-section">
              <p class="goals-label">Daily Goals (optional)</p>
            <div class="goals-row">
              <mat-form-field appearance="outline" class="goal-field auth-field">
                <mat-label>Calories</mat-label>
                <input matInput formControlName="dailyCalorieTarget" type="number">
                <span matSuffix class="goal-unit">kcal</span>
              </mat-form-field>
              <mat-form-field appearance="outline" class="goal-field auth-field">
                <mat-label>Protein</mat-label>
                <input matInput formControlName="dailyProteinTarget" type="number">
                <span matSuffix class="goal-unit">g</span>
              </mat-form-field>
            </div>
            <div class="goals-row">
              <mat-form-field appearance="outline" class="goal-field auth-field">
                <mat-label>Carbs</mat-label>
                <input matInput formControlName="dailyCarbTarget" type="number">
                <span matSuffix class="goal-unit">g</span>
              </mat-form-field>
              <mat-form-field appearance="outline" class="goal-field auth-field">
                <mat-label>Fat</mat-label>
                <input matInput formControlName="dailyFatTarget" type="number">
                <span matSuffix class="goal-unit">g</span>
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="auth-field">
              <mat-label>Daily Water Goal</mat-label>
              <input matInput formControlName="dailyWaterTarget" type="number">
              <span matSuffix class="goal-unit">oz</span>
            </mat-form-field>
            </div>

            <div class="terms-row" [class.terms-invalid]="isFieldInvalid('agreedToTerms')">
              <mat-checkbox formControlName="agreedToTerms" color="primary">
                I agree to the <a routerLink="/terms" class="terms-link" (click)="$event.stopPropagation()">Terms of Service</a> and <a routerLink="/privacy" class="terms-link" (click)="$event.stopPropagation()">Privacy Policy</a>
              </mat-checkbox>
              @if (isFieldInvalid('agreedToTerms')) {
                <span class="terms-error">You must agree to continue</span>
              }
            </div>

            <div class="auth-buttons">
              <button mat-flat-button class="auth-btn submit-btn" type="submit" [disabled]="loading">
                {{ loading ? 'Creating...' : 'Create Account' }}
              </button>
              @if (!useGisButton) {
                <button type="button" class="auth-btn custom-google-btn" (click)="onCustomGoogleClick()">
                  <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign up with Google
                </button>
              }
            </div>
          </form>

          @if (useGisButton) {
            <div id="google-signup-btn" class="google-btn-wrapper"></div>
          }

          <p class="auth-switch">
            Already have an account? <a routerLink="/login">Sign in</a>
          </p>
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
    .brand { text-align: center; margin-bottom: 20px; }
    .brand-link { text-decoration: none; }
    .brand-text { font-size: 26px; font-weight: 800; letter-spacing: 6px; color: var(--accent); }
    .brand-tagline { color: var(--text-muted); font-size: 13px; margin-top: 6px; }
    .auth-card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px; padding: 28px 32px;
      max-height: 90vh; overflow-y: auto;
      position: relative; z-index: 2;
    }
    .auth-card::-webkit-scrollbar { width: 6px; }
    .auth-card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
    .auth-card-header { text-align: center; margin-bottom: 24px; }
    .auth-card-header h2 {
      color: var(--text-primary); font-size: 20px; font-weight: 700;
      margin: 0 0 4px; letter-spacing: -0.3px;
    }
    .auth-subtitle {
      color: var(--text-muted); font-size: 14px; margin: 0;
    }

    .auth-form {
      display: flex; flex-direction: column; gap: 0;
    }
    .auth-field { margin-bottom: 10px; }
    mat-form-field { width: 100%; }
    /* Never show error text - keep layout fixed. Invalid = gray outline only */
    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none !important;
      min-height: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    :host ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-error,
    :host ::ng-deep .mat-mdc-form-field .mat-error,
    :host ::ng-deep .mat-mdc-form-field-error,
    :host ::ng-deep [class*="form-field-error"] {
      display: none !important;
    }
    /* Invalid = red outline so user sees which fields to fix */
    :host ::ng-deep .mat-mdc-form-field.field-error .mdc-notched-outline .mdc-notched-outline__leading,
    :host ::ng-deep .mat-mdc-form-field.field-error .mdc-notched-outline .mdc-notched-outline__notch,
    :host ::ng-deep .mat-mdc-form-field.field-error .mdc-notched-outline .mdc-notched-outline__trailing {
      border-color: #ff5252 !important;
    }
    :host ::ng-deep .mat-mdc-form-field.field-error.mdc-text-field--focused .mdc-notched-outline .mdc-notched-outline__leading,
    :host ::ng-deep .mat-mdc-form-field.field-error.mdc-text-field--focused .mdc-notched-outline .mdc-notched-outline__notch,
    :host ::ng-deep .mat-mdc-form-field.field-error.mdc-text-field--focused .mdc-notched-outline .mdc-notched-outline__trailing {
      border-color: #ff5252 !important;
    }
    :host ::ng-deep .mat-mdc-form-field.field-error .mdc-floating-label {
      color: #ff5252 !important;
    }
    :host ::ng-deep .mat-mdc-form-field.field-error .mat-mdc-input-element,
    :host ::ng-deep .mat-mdc-form-field.field-error input {
      caret-color: var(--text-primary) !important;
    }
    :host ::ng-deep .auth-form .mat-mdc-form-field {
      margin-bottom: 10px;
    }

    .auth-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    .auth-btn {
      width: 100% !important;
      min-width: 0 !important;
      height: 44px !important;
      min-height: 44px !important;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      box-sizing: border-box;
    }
    .submit-btn {
      background: var(--accent) !important;
      color: #0D0D0D !important;
    }
    .submit-btn:disabled { opacity: 0.5; }
    .custom-google-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: #fff;
      color: #3c4043;
      border: none;
      font-size: 14px;
      font-weight: 700;
      font-family: 'Roboto', sans-serif;
      cursor: pointer;
      transition: box-shadow 0.2s, background 0.2s;
    }
    .custom-google-btn:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      background: #f7f8f8;
    }

    .goals-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); }
    .goals-label {
      font-size: 11px; font-weight: 600; color: var(--text-muted);
      margin: 0 0 12px; letter-spacing: 0.8px; text-transform: uppercase;
    }
    .goals-row { display: flex; gap: 12px; margin-bottom: 8px; }
    .goals-row .goal-field { flex: 1; }
    .goal-unit { font-size: 12px; color: var(--text-muted); padding-right: 4px; }

    .terms-row { margin: 20px 0 16px; }
    .terms-row mat-checkbox { font-size: 13px; color: var(--text-muted); }
    .terms-link { color: var(--accent); text-decoration: none; font-weight: 600; }
    .terms-link:hover { text-decoration: underline; }
    .terms-error { display: block; font-size: 12px; color: #ff5252; margin-top: 4px; }
    .terms-invalid mat-checkbox { color: #ff5252 !important; }

    .google-icon { flex-shrink: 0; }
    .google-btn-wrapper { display: flex; justify-content: center; margin-top: 12px; }

    .auth-switch { text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 14px; }
    .auth-switch a { color: var(--accent); text-decoration: none; font-weight: 600; }
  `],
})
export class RegisterComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  form: FormGroup;
  loading = false;
  hidePassword = true;
  submitted = false;
  gridDots = Array.from({ length: 96 }, (_, i) => i);
  useGisButton = false;

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
      firstName: ['', [Validators.required, Validators.minLength(1)]],
      lastName: ['', [Validators.required, Validators.minLength(1)]],
      email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+[^.]$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      dateOfBirth: [null, Validators.required],
      gender: ['', Validators.required],
      dailyCalorieTarget: [2000],
      dailyProteinTarget: [150],
      dailyCarbTarget: [250],
      dailyFatTarget: [65],
      dailyWaterTarget: [64],
      agreedToTerms: [false, Validators.requiredTrue],
    });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.touched || this.submitted);
  }

  ngAfterViewInit(): void {
    if (!environment.googleClientId) return;
    this.waitForGoogleAndInit();
  }

  private waitForGoogleAndInit(retries = 20): void {
    if (typeof (window as any).google !== 'undefined' && (window as any).google?.accounts?.id) {
      this.useGisButton = true;
      setTimeout(() => {
        const google = (window as any).google;
        if (google?.accounts?.id?.initialize) {
          google.accounts.id.initialize({
            client_id: environment.googleClientId,
            callback: (response: any) => this.handleGoogleResponse(response),
          });
          const el = document.getElementById('google-signup-btn');
          if (el) google.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', width: 356, text: 'signup_with', shape: 'pill' });
        }
      });
      return;
    }
    if (retries > 0) {
      setTimeout(() => this.waitForGoogleAndInit(retries - 1), 150);
    }
  }

  onCustomGoogleClick(): void {
    if (environment.googleClientId && typeof (window as any).google !== 'undefined') {
      this.waitForGoogleAndInit();
      return;
    }
    this.snackBar.open('Google Sign-In requires a Client ID. Add it to environment.ts and .env (GOOGLE_CLIENT_ID).', 'Close', { duration: 5000 });
  }

  handleGoogleResponse(response: any): void {
    this.ngZone.run(() => {
      this.loading = true;
      this.authService.googleSignIn(response.credential)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (payload) => {
            // Google sign-up bypasses register form and auto-creates account; go to complete-profile or dashboard
            if (!payload.user.profileComplete) {
              this.router.navigate(['/complete-profile']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          },
          error: (err) => {
            this.loading = false;
            const message = err?.message || 'Google sign-up failed. Please try again.';
            this.snackBar.open(message, 'Close', { duration: 4000 });
          },
        });
    });
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

    // Send only fields the server's RegisterInput accepts (displayName, not firstName/lastName)
    this.authService.register({
      email: v.email,
      password: v.password,
      displayName: ((v.firstName || '').trim() + ' ' + (v.lastName || '').trim()).trim(),
      dateOfBirth: dob,
      gender: v.gender,
      agreedToTerms: true,
    }).pipe(
      switchMap(() => {
        const goals = {
          dailyCalorieTarget: v.dailyCalorieTarget || 2000,
          dailyProteinTarget: v.dailyProteinTarget || 150,
          dailyCarbTarget: v.dailyCarbTarget || 250,
          dailyFatTarget: v.dailyFatTarget || 65,
          dailyWaterGoalOz: v.dailyWaterTarget || 64,
        };
        return this.userService.updateProfile(goals).pipe(
          catchError(() => of(null)), // still navigate if update fails
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        const message = err?.message || 'Registration failed. Please try again.';
        this.snackBar.open(message, 'Close', { duration: 4000 });
      },
    });
  }
}
