import { Component, DestroyRef, AfterViewInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
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
import { PublicConfigService } from '../../../core/services/public-config.service';

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
        <div class="auth-topbar">
          <a routerLink="/" class="corner-logo" aria-label="Go to home page">
            <img src="favicon.svg" alt="" class="corner-logo-img">

          </a>
          <a routerLink="/login" class="top-action">Sign in</a>
        </div>
        <a routerLink="/" class="auth-brand-block" aria-label="Go to home page">
          <span class="brand-text">MAXRO</span>
        </a>
        <mat-card class="auth-card slide-up">
          <div class="auth-card-header">
            <h2>Create Account</h2>
            <p class="auth-subtitle">Sign up to start tracking your fitness</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
            <div class="split-row">
              <div class="field-stack">
                <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('firstName')" class="auth-field">
                  <mat-label>First Name</mat-label>
                  <input matInput formControlName="firstName" autocomplete="given-name">
                </mat-form-field>
                @if (fieldErrorMessage('firstName')) {
                  <div class="field-note error">{{ fieldErrorMessage('firstName') }}</div>
                }
              </div>

              <div class="field-stack">
                <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('lastName')" class="auth-field">
                  <mat-label>Last Name</mat-label>
                  <input matInput formControlName="lastName" autocomplete="family-name">
                </mat-form-field>
                @if (fieldErrorMessage('lastName')) {
                  <div class="field-note error">{{ fieldErrorMessage('lastName') }}</div>
                }
              </div>
            </div>

            <div class="field-stack">
              <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('email')" class="auth-field">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="text" inputmode="email" autocomplete="email">
              </mat-form-field>
              @if (fieldErrorMessage('email')) {
                <div class="field-note error">{{ fieldErrorMessage('email') }}</div>
              }
            </div>

            <div class="password-row">
              <div class="password-field-grid">
                <div class="field-stack">
                  <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('password')" class="auth-field">
                    <mat-label>Password</mat-label>
                    <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" autocomplete="new-password">
                    <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                      <mat-icon [svgIcon]="hidePassword ? 'mx-eye-off' : 'mx-eye'"></mat-icon>
                    </button>
                  </mat-form-field>
                  @if (fieldErrorMessage('password')) {
                    <div class="field-note error">{{ fieldErrorMessage('password') }}</div>
                  }
                </div>

                <div class="field-stack">
                  <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('confirmPassword')" class="auth-field">
                    <mat-label>Confirm Password</mat-label>
                    <input matInput formControlName="confirmPassword" [type]="hideConfirmPassword ? 'password' : 'text'" autocomplete="new-password">
                    <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
                      <mat-icon [svgIcon]="hideConfirmPassword ? 'mx-eye-off' : 'mx-eye'"></mat-icon>
                    </button>
                  </mat-form-field>
                  @if (fieldErrorMessage('confirmPassword')) {
                    <div class="field-note error">{{ fieldErrorMessage('confirmPassword') }}</div>
                  }
                </div>
              </div>

              <div class="password-popover">
                <span class="popover-title">Password guide</span>
                <span class="popover-rule" [class.pass]="passwordLengthMet">
                  <span class="rule-dot"></span>
                  At least 8 characters
                </span>
                <span class="popover-rule">
                  <span class="rule-dot"></span>
                  Letters, numbers, and symbols are all okay
                </span>
                <span class="popover-rule muted">
                  <span class="rule-dot"></span>
                  Avoid obvious passwords like your name or email
                </span>
              </div>
            </div>

            <div class="split-row">
              <div class="field-stack">
                <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('dateOfBirth')" class="auth-field">
                  <mat-label>Date of Birth</mat-label>
                  <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" [max]="maxDate" placeholder="MM/DD/YYYY" autocomplete="bday">
                  <mat-datepicker-toggle matSuffix [for]="dobPicker"><mat-icon svgIcon="mx-calendar"></mat-icon></mat-datepicker-toggle>
                  <mat-datepicker #dobPicker startView="multi-year" [startAt]="startDate"></mat-datepicker>
                </mat-form-field>
                @if (fieldErrorMessage('dateOfBirth')) {
                  <div class="field-note error">{{ fieldErrorMessage('dateOfBirth') }}</div>
                }
              </div>

              <div class="field-stack">
                <mat-form-field appearance="outline" [class.field-error]="isFieldInvalid('gender')" class="auth-field">
                  <mat-label>Gender</mat-label>
                  <mat-select formControlName="gender">
                    <mat-option value="Male">Male</mat-option>
                    <mat-option value="Female">Female</mat-option>
                    <mat-option value="Non-binary">Non-binary</mat-option>
                    <mat-option value="Prefer not to say">Prefer not to say</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (fieldErrorMessage('gender')) {
                  <div class="field-note error">{{ fieldErrorMessage('gender') }}</div>
                }
              </div>
            </div>

            <div class="goals-section">
              <div class="goals-header">
                <p class="goals-label">Daily Goals</p>
                <span class="goals-helper">Optional</span>
              </div>
              <div class="goals-grid">
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
                <mat-form-field appearance="outline" class="goal-field auth-field">
                  <mat-label>Water</mat-label>
                  <input matInput formControlName="dailyWaterTarget" type="number">
                  <span matSuffix class="goal-unit">oz</span>
                </mat-form-field>
              </div>
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
              <div class="google-btn-shell">
                <button type="button" class="auth-btn custom-google-btn" (click)="onCustomGoogleClick()">
                  <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign up with Google
                </button>
                @if (useGisButton) {
                  <div id="google-signup-btn" class="google-btn-wrapper" aria-hidden="true"></div>
                }
              </div>
            </div>
          </form>

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
      min-height: 100vh;
      height: 100dvh;
      background: var(--bg-primary);
      display: flex; align-items: center; justify-content: center;
      padding: 72px 18px 28px; position: relative; overflow: hidden;
      box-sizing: border-box;
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
      max-width: 980px;
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-height: 100%;
      padding-top: 0;
      padding-bottom: 8px;
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
      gap: 10px;
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
      margin-bottom: 12px;
      text-decoration: none;
      text-align: center;
    }
    .brand-text { font-size: clamp(28px, 4vw, 34px); font-weight: 800; letter-spacing: 7px; color: var(--accent); line-height: 1; }
    .brand-tagline { color: var(--text-muted); font-size: 13px; line-height: 1.2; }
    .top-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 22px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(12,12,12,0.72);
      color: var(--text-primary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease, background 0.18s ease;
    }
    .top-action:hover {
      border-color: var(--accent);
      color: var(--text-primary);
      background: rgba(16,16,16,0.88);
      transform: translateY(-1px);
    }
    .auth-card {
      background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)), var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 18px; padding: 16px 20px 24px;
      width: min(100%, 760px);
      overflow: visible;
      position: relative; z-index: 2;
      box-shadow: 0 28px 70px rgba(0,0,0,0.3);
    }
    .auth-card-header { text-align: left; margin-bottom: 14px; }
    .auth-card-header h2 {
      color: var(--text-primary); font-size: 22px; font-weight: 700;
      margin: 0 0 4px; letter-spacing: -0.3px;
    }
    .auth-subtitle { color: var(--text-muted); font-size: 13px; margin: 0; line-height: 1.45; }

    .auth-form { display: flex; flex-direction: column; gap: 6px; }
    .split-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .field-stack {
      min-width: 0;
      display: grid;
      grid-template-rows: auto 16px;
      row-gap: 4px;
      align-content: start;
    }
    .auth-field { margin-bottom: 0; }
    mat-form-field { width: 100%; }
    :host ::ng-deep .auth-form .mat-mdc-text-field-wrapper {
      align-items: center;
      min-height: 52px;
    }
    :host ::ng-deep .auth-form .mat-mdc-form-field-infix {
      min-height: 24px;
      padding-top: 13px !important;
      padding-bottom: 13px !important;
    }
    :host ::ng-deep .auth-form .mat-mdc-input-element {
      margin: 0 !important;
      line-height: 1.3;
    }
    :host ::ng-deep .auth-form .mat-mdc-form-field-icon-suffix,
    :host ::ng-deep .auth-form .mat-mdc-form-field-icon-prefix {
      align-self: center;
      padding-right: 4px;
    }
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
    :host ::ng-deep .auth-form .mat-mdc-form-field { margin-bottom: 0; }
    .field-note {
      margin: 0 0 0 4px;
      min-height: 16px;
      display: flex;
      align-items: center;
      font-size: 11px;
      line-height: 1.3;
      visibility: hidden;
    }
    .field-note.visible {
      visibility: visible;
    }
    .field-note.error {
      color: #ff6f61;
    }
    .password-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 10px;
      align-items: start;
    }
    .password-field-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      min-width: 0;
    }
    .password-popover {
      display: flex;
      min-height: 52px;
      flex-direction: column;
      gap: 8px;
      padding: 12px;

      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(14,16,18,0.96);
      box-shadow: inset 0 0 0 1px rgba(155,240,180,0.05), 0 12px 24px rgba(0,0,0,0.22);
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
      z-index: 3;
      transition: none;
    }

    .popover-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .popover-rule {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.4;
    }
    .popover-rule.pass {
      color: #9bf0b4;
    }
    .popover-rule.muted {
      color: rgba(255,255,255,0.52);
    }
    .rule-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      flex-shrink: 0;
    }
    .popover-rule.pass .rule-dot {
      background: #1db954;
    }

    .auth-buttons { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 2px; }
    .auth-btn {
      width: 100% !important;
      min-width: 0 !important;
      height: 44px !important;
      min-height: 44px !important;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      box-sizing: border-box;
    }
    .submit-btn { background: var(--accent) !important; color: #0D0D0D !important; }
    .submit-btn:disabled { opacity: 0.5; }
    .google-btn-shell { position: relative; }
    .google-btn-wrapper {
      position: absolute; inset: 0; z-index: 1;
      opacity: 0; overflow: hidden; border-radius: 10px;
      pointer-events: none;
    }
    :host ::ng-deep #google-signup-btn > div {
      width: 100% !important;
      min-width: 100% !important;
    }
    .custom-google-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #fff;
      color: #3c4043;
      border: none;
      font-size: 14px;
      font-weight: 700;
      font-family: 'Roboto', sans-serif;
      cursor: pointer;
      transition: box-shadow 0.2s, background 0.2s;
      position: relative; z-index: 2;
    }
    .custom-google-btn:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.3); background: #f7f8f8; }

    .goals-section { margin-top: 0; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }
    .goals-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .goals-label {
      font-size: 11px; font-weight: 700; color: var(--text-primary);
      margin: 0; letter-spacing: 0.1em; text-transform: uppercase;
    }
    .goals-helper { color: var(--text-muted); font-size: 11px; font-weight: 600; }
    .goals-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
    .goal-unit { font-size: 11px; color: var(--text-muted); padding-right: 4px; }

    .terms-row { margin: 2px 0 0; }
    .terms-row mat-checkbox { font-size: 13px; color: var(--text-muted); }
    .terms-link { color: var(--accent); text-decoration: none; font-weight: 600; }
    .terms-link:hover { text-decoration: underline; }
    .terms-error { display: block; font-size: 12px; color: #ff5252; margin-top: 4px; }
    .terms-invalid mat-checkbox { color: #ff5252 !important; }

    .google-icon { flex-shrink: 0; }
    .auth-switch { text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 10px; margin-bottom: 2px; }
    .auth-switch a { color: var(--accent); text-decoration: none; font-weight: 600; }
    .auth-switch a:hover { text-decoration: underline; }
    @media (max-width: 900px) {
      .split-row,
      .password-row,
      .password-field-grid,
      .goals-grid {
        grid-template-columns: 1fr;
      }
      .auth-buttons { grid-template-columns: 1fr; }
      .password-popover {
        min-height: 58px;
        padding: 12px;
      }
    }
    @media (max-width: 700px) {
      .auth-page {
        padding: 84px 12px 12px;
        overflow: auto;
        align-items: flex-start;
        height: auto;
      }
      .auth-topbar { padding: 18px 16px; }
      .auth-brand-block { margin-bottom: 16px; }
      .brand-text { font-size: 18px; letter-spacing: 4px; }
      .brand-tagline { font-size: 11px; }
    .corner-logo-img { width: 30px; height: 30px; border-radius: 6px; flex-shrink: 0; }
      .top-action {
        min-height: 40px;
        padding: 0 16px;
        font-size: 12px;
      }
      .auth-card {
        padding: 18px 16px;
        border-radius: 16px;
      }
    }
    @media (max-height: 860px) and (min-width: 901px) {
      .auth-card { padding: 16px 20px; }
      .auth-form { gap: 6px; }
      .field-note { min-height: 14px; }
    }
  `],
})
export class RegisterComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly publicConfig = inject(PublicConfigService);
  form: FormGroup;
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  submitted = false;
  gridDots = Array.from({ length: 96 }, (_, i) => i);
  useGisButton = false;
  private readonly namePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
  private readonly passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value ?? '';
    const confirmPassword = control.get('confirmPassword')?.value ?? '';
    if (!password || !confirmPassword) {
      return null;
    }
    return password === confirmPassword ? null : { passwordMismatch: true };
  };

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
      firstName: ['', [Validators.required, Validators.minLength(1), Validators.pattern(this.namePattern)]],
      lastName: ['', [Validators.required, Validators.minLength(1), Validators.pattern(this.namePattern)]],
      email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@(?!\.)[^\s@]+$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      dateOfBirth: [null, Validators.required],
      gender: ['', Validators.required],
      dailyCalorieTarget: [2000],
      dailyProteinTarget: [150],
      dailyCarbTarget: [250],
      dailyFatTarget: [65],
      dailyWaterTarget: [64],
      agreedToTerms: [false, Validators.requiredTrue],
    }, {
      validators: this.passwordMatchValidator,
    });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.controls[field];
    const interacted = ctrl.touched || this.submitted;
    if (field === 'confirmPassword') {
      return interacted && (ctrl.invalid || this.form.hasError('passwordMismatch'));
    }
    return ctrl.invalid && interacted;
  }

  get passwordLengthMet(): boolean {
    return (this.form.controls['password'].value || '').length >= 8;
  }

  fieldErrorMessage(field: string): string {
    const control = this.form.controls[field];
    if (!this.isFieldInvalid(field)) {
      return '';
    }

    if (control.hasError('required')) {
      switch (field) {
        case 'firstName': return 'First name is required';
        case 'lastName': return 'Last name is required';
        case 'email': return 'Email is required';
        case 'password': return 'Password is required';
        case 'confirmPassword': return 'Confirm your password';
        case 'dateOfBirth': return 'Date of birth is required';
        case 'gender': return 'Gender is required';
        default: return 'This field is required';
      }
    }

    if ((field === 'firstName' || field === 'lastName') && control.hasError('pattern')) {
      return field === 'firstName'
        ? 'First name can only use letters'
        : 'Last name can only use letters';
    }

    if (field === 'email' && control.hasError('pattern')) {
      return 'Enter a valid email';
    }

    if (field === 'password' && control.hasError('minlength')) {
      return 'Password must be at least 8 characters';
    }

    if (field === 'confirmPassword' && this.form.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }

    if (field === 'dateOfBirth' && control.hasError('matDatepickerParse')) {
      return 'Enter a valid date';
    }

    if (field === 'dateOfBirth' && control.hasError('matDatepickerMax')) {
      return 'Date of birth cannot be in the future';
    }

    return '';
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
        const el = document.getElementById('google-signup-btn');
        if (google?.accounts?.id?.initialize && el) {
          google.accounts.id.initialize({
            client_id: this.publicConfig.googleClientId,
            callback: (response: any) => this.handleGoogleResponse(response),
          });
          const width = Math.max(Math.round(el.getBoundingClientRect().width || 320), 280);
          google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width, text: 'signup_with', shape: 'pill' });
        }
      });
      return;
    }
    if (retries > 0) {
      setTimeout(() => this.waitForGoogleAndInit(retries - 1), 150);
    }
  }

  onCustomGoogleClick(): void {
    if (this.useGisButton && this.clickGoogleButton('google-signup-btn')) {
      return;
    }
    if (this.publicConfig.googleClientId && typeof (window as any).google !== 'undefined') {
      this.waitForGoogleAndInit();
      setTimeout(() => {
        if (!this.clickGoogleButton('google-signup-btn')) {
          this.promptGoogleFallback();
        }
      }, 150);
      return;
    }
    this.snackBar.open('Google Sign-In is not configured yet. Add GOOGLE_CLIENT_ID on the backend so MAXRO can load it.', 'Close', { duration: 5000 });
  }

  private clickGoogleButton(containerId: string): boolean {
    const host = document.getElementById(containerId);
    const clickable = host?.querySelector('div[role="button"], button') as HTMLElement | null;
    clickable?.click();
    return !!clickable;
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

    this.authService.register({
      email: v.email,
      password: v.password,
      firstName: (v.firstName || '').trim(),
      lastName: (v.lastName || '').trim(),
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
        return this.userService.updateProfile(goals).pipe(catchError(() => of(null)));
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




