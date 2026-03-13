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
import { PublicConfigService } from '../../../core/services/public-config.service';

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
        <div class="auth-topbar">
          <a routerLink="/" class="corner-logo" aria-label="Go to home page">
            <img src="favicon.svg" alt="" class="corner-logo-img">

          </a>
          <a routerLink="/register" class="top-action">Sign up</a>
        </div>
        <a routerLink="/" class="auth-brand-block" aria-label="Go to home page">
          <span class="brand-text">MAXRO</span>
          <span class="brand-tagline">Track. Lift. Fuel. Repeat.</span>
        </a>
        <mat-card class="auth-card slide-up">
          <div class="auth-card-header">
            <h2>Sign In</h2>
            <p class="auth-subtitle">Welcome back to your fitness journey</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
            <div class="field-stack">
              <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('email') || authFailed">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="text" inputmode="email" autocomplete="email">
              </mat-form-field>
              <div class="field-note error" [class.visible]="!!emailErrorMessage">{{ emailErrorMessage || ' ' }}</div>
            </div>
            <div class="field-stack">
              <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('password') || authFailed">
                <mat-label>Password</mat-label>
                <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" autocomplete="current-password">
                <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                  <mat-icon [svgIcon]="hidePassword ? 'mx-eye-off' : 'mx-eye'"></mat-icon>
                </button>
              </mat-form-field>
              <div class="field-note error" [class.visible]="!!passwordErrorMessage">{{ passwordErrorMessage || ' ' }}</div>
            </div>
            <button mat-flat-button class="submit-btn" type="submit" [disabled]="loading">
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <div class="google-btn-shell">
            <button type="button" class="custom-google-btn" (click)="onCustomGoogleClick()">
              <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            @if (useGisButton) {
              <div id="google-signin-btn" class="google-btn-wrapper" aria-hidden="true"></div>
            }
          </div>

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
      padding: 96px 24px 24px; position: relative; overflow: hidden;
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

    .auth-container {
      width: 100%;
      max-width: 960px;
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: clamp(18px, 4vh, 36px);
    }
    .auth-topbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 20px 40px;
      box-sizing: border-box;
    }
    .corner-logo { display: inline-flex; align-items: center; gap: 0; text-decoration: none; }
    .corner-logo-img { width: 30px; height: 30px; border-radius: 6px; flex-shrink: 0; }
    .auth-brand-block {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-bottom: 22px;
      text-decoration: none;
      text-align: center;
    }
    .brand-text { font-size: clamp(28px, 4vw, 34px); font-weight: 800; letter-spacing: 7px; color: var(--accent); line-height: 1; }
    .brand-tagline { color: var(--text-muted); font-size: 13px; line-height: 1.2; }
    .top-action { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 22px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); background: rgba(12,12,12,0.72); color: var(--text-primary); text-decoration: none; font-size: 13px; font-weight: 700; transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease, background 0.18s ease; }
    .top-action:hover { border-color: var(--accent); color: var(--text-primary); background: rgba(16,16,16,0.88); transform: translateY(-1px); }
    .auth-card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px; padding: 28px 32px;
      width: min(100%, 360px);
      margin: 0 auto;
    }
    .auth-card-header { text-align: center; margin-bottom: 24px; }
    .auth-card-header h2 {
      color: var(--text-primary); font-size: 20px; font-weight: 700;
      margin: 0 0 4px; letter-spacing: -0.3px;
    }
    .auth-subtitle { color: var(--text-muted); font-size: 14px; margin: 0; }

    .auth-form { display: flex; flex-direction: column; gap: 8px; }
    .field-stack { display: grid; grid-template-rows: auto 16px; row-gap: 4px; }
    :host ::ng-deep .auth-form .mat-mdc-form-field { margin-bottom: 0; }
    mat-form-field { width: 100%; }
    :host ::ng-deep .auth-form .mat-mdc-text-field-wrapper {
      align-items: center;
      min-height: 58px;
    }
    :host ::ng-deep .auth-form .mat-mdc-form-field-infix {
      min-height: 24px;
      padding-top: 16px !important;
      padding-bottom: 16px !important;
    }
    :host ::ng-deep .auth-form .mat-mdc-input-element {
      margin: 0 !important;
      line-height: 1.3;
    }
    :host ::ng-deep .auth-form .mat-mdc-form-field-icon-suffix {
      align-self: center;
      padding-right: 4px;
    }
    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      min-height: 0 !important;
    }
    :host ::ng-deep .mat-mdc-form-field:not(.field-error) .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
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
    :host ::ng-deep .auth-form input:-webkit-autofill,
    :host ::ng-deep .auth-form input:-webkit-autofill:hover,
    :host ::ng-deep .auth-form input:-webkit-autofill:focus,
    :host ::ng-deep .auth-form input:-webkit-autofill:active {
      -webkit-text-fill-color: var(--text-primary) !important;
      caret-color: var(--text-primary) !important;
      transition: background-color 9999s ease-in-out 0s;
      box-shadow: 0 0 0 1000px #111214 inset !important;
      -webkit-box-shadow: 0 0 0 1000px #111214 inset !important;
      border-radius: inherit;
    }
    .field-note {
      margin: 0 0 0 4px;
      min-height: 16px;
      display: flex;
      align-items: center;
      font-size: 11px;
      line-height: 1.25;
      visibility: hidden;
    }
    .field-note.visible {
      visibility: visible;
    }
    .field-note.error {
      color: #ff6f61;
    }
    .submit-btn {
      width: 100%; height: 40px;
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; font-size: 14px; border-radius: 10px; margin-top: 4px;
    }
    .submit-btn:disabled { opacity: 0.5; }

    .google-btn-shell { position: relative; margin-top: 12px; }
    .google-btn-wrapper {
      position: absolute; inset: 0; z-index: 1;
      opacity: 0; overflow: hidden; border-radius: 20px;
      pointer-events: none;
    }
    :host ::ng-deep #google-signin-btn > div {
      width: 100% !important;
      min-width: 100% !important;
    }
    .custom-google-btn {
      width: 100%; height: 40px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      background: #fff; color: #3c4043;
      border: none; border-radius: 20px;
      font-size: 13px; font-weight: 500; font-family: 'Roboto', sans-serif;
      cursor: pointer; transition: box-shadow 0.2s, background 0.2s;
      position: relative; z-index: 2;
    }
    .custom-google-btn:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.3); background: #f7f8f8; }
    .google-icon { flex-shrink: 0; }

    .auth-switch { text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 14px; }
    .auth-switch a { color: var(--accent); text-decoration: none; font-weight: 600; }
    .auth-switch a:hover { text-decoration: underline; }
    @media (max-width: 700px) {
      .auth-page { padding: 84px 16px 16px; align-items: flex-start; }
      .auth-topbar { padding: 18px 16px; }
      .auth-brand-block { margin-bottom: 18px; }
      .brand-text { font-size: 18px; letter-spacing: 4px; }
      .brand-tagline { font-size: 11px; }
    .corner-logo-img { width: 30px; height: 30px; border-radius: 6px; flex-shrink: 0; }
      .top-action { min-height: 40px; padding: 0 16px; font-size: 12px; }
      .field-stack { grid-template-rows: auto 14px; }
      .field-note { min-height: 14px; font-size: 10px; }
      .auth-card { padding: 24px 22px; }
    }
  `],
})
export class LoginComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly publicConfig = inject(PublicConfigService);
  form: FormGroup;
  loading = false;
  hidePassword = true;
  submitted = false;
  authFailed = false;
  gridDots = Array.from({ length: 96 }, (_, i) => i);
  useGisButton = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@(?!\.)[^\s@]+$/)]],
      password: ['', Validators.required],
    });

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.authFailed) {
          this.authFailed = false;
        }
      });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.touched || this.submitted);
  }

  get emailErrorMessage(): string {
    const control = this.form.controls['email'];
    if (!this.isFieldInvalid('email')) return '';
    if (control.hasError('required')) return 'Email is required';
    if (control.hasError('pattern')) return 'Enter a valid email';
    return '';
  }

  get passwordErrorMessage(): string {
    if (!this.isFieldInvalid('password')) return '';
    return 'Password is required';
  }

  ngAfterViewInit(): void {
    if (!this.publicConfig.googleClientId) return;
    this.waitForGoogleAndInit();
  }

  private waitForGoogleAndInit(retries = 20): void {
    if (typeof (window as any).google !== 'undefined' && (window as any).google?.accounts?.id) {
      this.useGisButton = true;
      setTimeout(() => {
        const google = (window as any).google;
        const el = document.getElementById('google-signin-btn');
        if (google?.accounts?.id?.initialize && el) {
          google.accounts.id.initialize({
            client_id: this.publicConfig.googleClientId,
            callback: (response: any) => this.handleGoogleResponse(response),
          });
          const width = Math.max(Math.round(el.getBoundingClientRect().width || 320), 280);
          google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width, text: 'signin_with', shape: 'pill' });
        }
      });
      return;
    }
    if (retries > 0) {
      setTimeout(() => this.waitForGoogleAndInit(retries - 1), 150);
    }
  }

  onCustomGoogleClick(): void {
    if (!this.publicConfig.googleClientId) {
      this.snackBar.open('Google Sign-In is not configured yet. Add GOOGLE_CLIENT_ID on the backend so Maxro can load it.', 'Close', { duration: 5000 });
      return;
    }
    this.waitForGoogleAndInit();
    setTimeout(() => {
      if (!this.clickGoogleButton('google-signin-btn')) {
        this.promptGoogleFallback();
      }
    }, 150);
  }

  private clickGoogleButton(containerId: string): boolean {
    const host = document.getElementById(containerId);
    const clickable = host?.querySelector('div[role="button"], button') as HTMLElement | null;
    if (!clickable) {
      return false;
    }
    clickable.click();
    return true;
  }

  private promptGoogleFallback(): void {
    const google = (window as any).google;
    if (google?.accounts?.id?.prompt) {
      google.accounts.id.prompt();
      return;
    }
    this.snackBar.open('Google Sign-In is still loading. Try again in a second.', 'Close', { duration: 3000 });
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
    this.authFailed = false;
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
          this.authFailed = true;
          this.form.controls['email'].markAsTouched();
          this.form.controls['password'].markAsTouched();
          const message = err?.message || 'Login failed. Please try again.';
          this.snackBar.open(message, 'Close', { duration: 4000 });
        },
      });
  }
}







