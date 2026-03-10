import { Component, DestroyRef, inject, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule,
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
            <h2>Sign In</h2>
            <p class="auth-subtitle">Welcome back to your fitness journey</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('email')">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email">
              @if (isFieldInvalid('email')) {
                @if (form.controls['email'].hasError('required')) {
                  <mat-error>Email is required</mat-error>
                } @else if (form.controls['email'].hasError('pattern')) {
                  <mat-error>Invalid email format</mat-error>
                }
              }
            </mat-form-field>
            <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('password')">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" autocomplete="current-password">
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon [svgIcon]="hidePassword ? 'mx-eye-off' : 'mx-eye'"></mat-icon>
              </button>
              @if (isFieldInvalid('password')) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>
            <button mat-flat-button class="submit-btn" type="submit" [disabled]="loading">
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          @if (useGisButton) {
            <div id="google-signin-btn" class="google-btn-wrapper"></div>
          } @else {
            <button type="button" class="custom-google-btn" (click)="onCustomGoogleClick()">
              <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          }

          <p class="auth-switch">
            Don't have an account? <a routerLink="/register">Create one</a>
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

    .auth-container { width: 100%; max-width: 360px; position: relative; z-index: 1; }
    .brand { text-align: center; margin-bottom: 20px; }
    .brand-link { text-decoration: none; }
    .brand-text { font-size: 26px; font-weight: 800; letter-spacing: 6px; color: var(--accent); }
    .brand-tagline { color: var(--text-muted); font-size: 13px; margin-top: 6px; }
    .auth-card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px; padding: 28px 32px;
    }
    .auth-card-header { text-align: center; margin-bottom: 24px; }
    .auth-card-header h2 {
      color: var(--text-primary); font-size: 20px; font-weight: 700;
      margin: 0 0 4px; letter-spacing: -0.3px;
    }
    .auth-subtitle { color: var(--text-muted); font-size: 14px; margin: 0; }

    .auth-form { display: flex; flex-direction: column; gap: 0; }
    :host ::ng-deep .auth-form .mat-mdc-form-field { margin-bottom: 20px; }
    mat-form-field { width: 100%; }
    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      min-height: 0 !important;
    }
    :host ::ng-deep .mat-mdc-form-field:not(.field-error) .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
    :host ::ng-deep .mat-mdc-form-field.field-error .mat-mdc-input-element,
    :host ::ng-deep .mat-mdc-form-field.field-error input {
      caret-color: var(--text-primary) !important;
    }
    .submit-btn {
      width: 100%; height: 40px;
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; font-size: 14px; border-radius: 10px; margin-top: 4px;
    }
    .submit-btn:disabled { opacity: 0.5; }

    .google-btn-wrapper { display: flex; justify-content: center; margin-top: 12px; }
    .custom-google-btn {
      width: 100%; height: 40px; margin-top: 12px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      background: #fff; color: #3c4043;
      border: none; border-radius: 20px;
      font-size: 13px; font-weight: 500; font-family: 'Roboto', sans-serif;
      cursor: pointer; transition: box-shadow 0.2s, background 0.2s;
    }
    .custom-google-btn:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.3); background: #f7f8f8; }
    .google-icon { flex-shrink: 0; }

    .auth-switch { text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 14px; }
    .auth-switch a { color: var(--accent); text-decoration: none; font-weight: 600; }
    .auth-switch a:hover { text-decoration: underline; }
  `],
})
export class LoginComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  form: FormGroup;
  loading = false;
  hidePassword = true;
  submitted = false;
  gridDots = Array.from({ length: 96 }, (_, i) => i);
  useGisButton = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+[^.]$/)]],
      password: ['', Validators.required],
    });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.touched || this.submitted);
  }

  ngAfterViewInit(): void {
    if (environment.googleClientId && typeof google !== 'undefined') {
      this.useGisButton = true;
      setTimeout(() => {
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: any) => this.handleGoogleResponse(response),
        });
        google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { theme: 'filled_black', size: 'large', width: 356, text: 'continue_with', shape: 'pill' },
        );
      });
    }
  }

  onCustomGoogleClick(): void {
    this.snackBar.open('Google Sign-In requires a Client ID. Configure GOOGLE_CLIENT_ID to enable.', 'Close', { duration: 5000 });
  }

  handleGoogleResponse(response: any): void {
    this.ngZone.run(() => {
      this.loading = true;
      this.authService.googleSignIn(response.credential)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (payload) => {
            if (!payload.user.profileComplete) {
              this.router.navigate(['/complete-profile']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          },
          error: (err) => {
            this.loading = false;
            const message = err?.message || 'Google sign-in failed. Please try again.';
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
    this.authService.login(this.form.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          if (!payload.user.profileComplete) {
            this.router.navigate(['/complete-profile']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.loading = false;
          const message = err?.message || 'Login failed. Please try again.';
          this.snackBar.open(message, 'Close', { duration: 4000 });
        },
      });
  }
}
