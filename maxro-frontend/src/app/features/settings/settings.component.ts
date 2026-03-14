import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule, MatSnackBarModule,
  ],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1>Settings</h1>
        <p class="page-subtitle">Manage your account and preferences</p>
      </div>

      <div class="settings-grid">
        <!-- Profile Section -->
        <mat-card class="settings-card">
          <div class="card-header">
            <mat-icon svgIcon="mx-user" class="card-icon"></mat-icon>
            <div>
              <h3>Profile</h3>
              <p class="card-desc">Update your personal information</p>
            </div>
          </div>
          <div class="avatar-section">
            <div class="avatar-preview" (click)="avatarInput.click()">
              @if (avatarPreviewUrl) {
                <img [src]="avatarPreviewUrl" alt="Profile" class="avatar-img" />
              } @else {
                <span class="avatar-initial">{{ userInitial }}</span>
              }
              <div class="avatar-overlay">
                <mat-icon svgIcon="mx-plus"></mat-icon>
              </div>
            </div>
            <input #avatarInput type="file" accept="image/*" hidden (change)="onAvatarSelect($event)">
            <div class="avatar-actions">
              <span class="avatar-hint">Click to change photo</span>
              @if (avatarPreviewUrl) {
                <button class="avatar-remove" (click)="removeAvatar()">Remove</button>
              }
            </div>
          </div>
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="settings-form">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName">
                @if (profileForm.controls['firstName'].touched && profileForm.controls['firstName'].hasError('pattern')) {
                  <mat-error>First name can only use letters</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName">
                @if (profileForm.controls['lastName'].touched && profileForm.controls['lastName'].hasError('pattern')) {
                  <mat-error>Last name can only use letters</mat-error>
                }
              </mat-form-field>
            </div>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Weight (lbs)</mat-label>
                <input matInput formControlName="bodyWeightLbs" type="number">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Height (inches)</mat-label>
                <input matInput formControlName="heightInches" type="number">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Fitness Goal</mat-label>
              <mat-select formControlName="fitnessGoal">
                <mat-option value="Build Muscle">Build Muscle</mat-option>
                <mat-option value="Lose Weight">Lose Weight</mat-option>
                <mat-option value="Maintain">Maintain</mat-option>
                <mat-option value="Increase Strength">Increase Strength</mat-option>
                <mat-option value="Improve Endurance">Improve Endurance</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-flat-button class="save-btn" type="submit" [disabled]="savingProfile || profileForm.pristine">
              {{ savingProfile ? 'Saving...' : 'Save Changes' }}
            </button>
          </form>
        </mat-card>

        <!-- Nutrition Targets -->
        <mat-card class="settings-card">
          <div class="card-header">
            <mat-icon svgIcon="mx-utensils" class="card-icon"></mat-icon>
            <div>
              <h3>Nutrition Targets</h3>
              <p class="card-desc">Set your daily macro and calorie goals</p>
            </div>
          </div>
          <form [formGroup]="nutritionForm" (ngSubmit)="saveNutrition()" class="settings-form">
            <mat-form-field appearance="outline">
              <mat-label>Daily Calories (kcal)</mat-label>
              <input matInput formControlName="dailyCalorieTarget" type="number">
            </mat-form-field>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Protein (g)</mat-label>
                <input matInput formControlName="dailyProteinTarget" type="number">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Carbs (g)</mat-label>
                <input matInput formControlName="dailyCarbTarget" type="number">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fat (g)</mat-label>
                <input matInput formControlName="dailyFatTarget" type="number">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Daily Water Goal (oz)</mat-label>
              <input matInput formControlName="dailyWaterGoalOz" type="number">
            </mat-form-field>
            <button mat-flat-button class="save-btn" type="submit" [disabled]="savingNutrition || nutritionForm.pristine">
              {{ savingNutrition ? 'Saving...' : 'Save Targets' }}
            </button>
          </form>
        </mat-card>

        <!-- Notifications -->
        <mat-card class="settings-card">
          <div class="card-header">
            <mat-icon svgIcon="mx-bell" class="card-icon"></mat-icon>
            <div>
              <h3>Notifications</h3>
              <p class="card-desc">Control what alerts you receive</p>
            </div>
          </div>
          <div class="toggle-group">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">Workout Reminders</span>
                <span class="toggle-desc">Daily reminder to log your workout</span>
              </div>
              <mat-slide-toggle [(ngModel)]="workoutReminders" [ngModelOptions]="{standalone: true}" (change)="onPrefChange('workoutReminders', workoutReminders)"></mat-slide-toggle>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">Water Reminders</span>
                <span class="toggle-desc">Periodic hydration nudges</span>
              </div>
              <mat-slide-toggle [(ngModel)]="waterReminders" [ngModelOptions]="{standalone: true}" (change)="onPrefChange('waterReminders', waterReminders)"></mat-slide-toggle>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">AI Suggestions</span>
                <span class="toggle-desc">Smart training tips on your dashboard</span>
              </div>
              <mat-slide-toggle [(ngModel)]="aiSuggestions" [ngModelOptions]="{standalone: true}" (change)="onPrefChange('aiSuggestions', aiSuggestions)"></mat-slide-toggle>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">PR Celebrations</span>
                <span class="toggle-desc">Confetti and alerts on new records</span>
              </div>
              <mat-slide-toggle [(ngModel)]="prCelebrations" [ngModelOptions]="{standalone: true}" (change)="onPrefChange('prCelebrations', prCelebrations)"></mat-slide-toggle>
            </div>
          </div>
        </mat-card>

        <mat-card class="settings-card">
          <div class="card-header">
            <mat-icon svgIcon="mx-shield" class="card-icon"></mat-icon>
            <div>
              <h3>Password</h3>
              <p class="card-desc">Control how you sign into your account</p>
            </div>
          </div>
          <form [formGroup]="passwordForm" (ngSubmit)="savePassword()" class="settings-form">
            @if (user?.hasPassword) {
              <mat-form-field appearance="outline">
                <mat-label>Current Password</mat-label>
                <input matInput formControlName="currentPassword" [type]="showCurrentPassword ? 'text' : 'password'" autocomplete="current-password">
                <button mat-icon-button matSuffix type="button" (click)="showCurrentPassword = !showCurrentPassword">
                  <mat-icon [svgIcon]="showCurrentPassword ? 'mx-eye-off' : 'mx-eye'"></mat-icon>
                </button>
                @if (passwordForm.controls['currentPassword'].touched && passwordForm.controls['currentPassword'].hasError('required')) {
                  <mat-error>Current password is required</mat-error>
                }
              </mat-form-field>
            } @else {
              <p class="password-info">You signed up with Google, so you can set your first password here without entering an old one.</p>
            }

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>New Password</mat-label>
                <input matInput formControlName="newPassword" [type]="showNewPassword ? 'text' : 'password'" autocomplete="new-password">
                <button mat-icon-button matSuffix type="button" (click)="showNewPassword = !showNewPassword">
                  <mat-icon [svgIcon]="showNewPassword ? 'mx-eye-off' : 'mx-eye'"></mat-icon>
                </button>
                @if (passwordForm.controls['newPassword'].touched && passwordForm.controls['newPassword'].hasError('minlength')) {
                  <mat-error>Password must be at least 8 characters</mat-error>
                }
                @if (passwordForm.controls['newPassword'].touched && passwordForm.controls['newPassword'].hasError('required')) {
                  <mat-error>New password is required</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Confirm New Password</mat-label>
                <input matInput formControlName="confirmNewPassword" [type]="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password">
                <button mat-icon-button matSuffix type="button" (click)="showConfirmPassword = !showConfirmPassword">
                  <mat-icon [svgIcon]="showConfirmPassword ? 'mx-eye-off' : 'mx-eye'"></mat-icon>
                </button>
                @if (passwordForm.controls['confirmNewPassword'].touched && passwordForm.controls['confirmNewPassword'].hasError('required')) {
                  <mat-error>Confirm your new password</mat-error>
                }
                @if (passwordForm.touched && passwordForm.hasError('passwordMismatch')) {
                  <mat-error>Passwords must match</mat-error>
                }
              </mat-form-field>
            </div>

            @if (user?.hasPassword) {
              <p class="password-info">Enter your current password to protect the change.</p>
            }

            <button mat-flat-button class="save-btn" type="submit" [disabled]="savingPassword || passwordForm.pristine || passwordForm.invalid">
              {{ savingPassword ? 'Saving...' : (user?.hasPassword ? 'Update Password' : 'Set Password') }}
            </button>
          </form>
        </mat-card>

        <!-- Account & Privacy -->
        <mat-card class="settings-card">
          <div class="card-header">
            <mat-icon svgIcon="mx-shield" class="card-icon"></mat-icon>
            <div>
              <h3>Account & Privacy</h3>
              <p class="card-desc">Security and data management</p>
            </div>
          </div>
          <div class="account-section">
            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">{{ user?.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Member Since</span>
              <span class="info-value">{{ user?.createdAt | date:'MMMM d, y' }}</span>
            </div>
            <div class="link-group">
              <a routerLink="/terms" class="settings-link">
                <mat-icon svgIcon="mx-chevron-right" class="link-arrow"></mat-icon>
                Terms of Service
              </a>
              <a routerLink="/privacy" class="settings-link">
                <mat-icon svgIcon="mx-chevron-right" class="link-arrow"></mat-icon>
                Privacy Policy
              </a>
            </div>
          </div>
        </mat-card>

        <!-- Danger Zone -->
        <mat-card class="settings-card danger-card">
          <div class="card-header">
            <mat-icon svgIcon="mx-alert-triangle" class="card-icon danger-icon"></mat-icon>
            <div>
              <h3 class="danger-title">Danger Zone</h3>
              <p class="card-desc">Irreversible account actions</p>
            </div>
          </div>
          <div class="danger-section">
            @if (!showDeleteConfirm) {
              <p class="danger-text">
                Deleting your account will permanently remove all your data including workouts,
                nutrition logs, personal records, and water tracking history. This cannot be undone.
              </p>
              <button mat-stroked-button class="delete-btn" (click)="showDeleteConfirm = true">
                <mat-icon svgIcon="mx-trash"></mat-icon>
                Delete My Account
              </button>
            } @else {
              <div class="delete-confirm">
                <p class="confirm-text">
                  Are you absolutely sure? Type your email to confirm:
                </p>
                <mat-form-field appearance="outline" class="confirm-input">
                  <mat-label>Confirm email</mat-label>
                  <input matInput [ngModelOptions]="{standalone: true}" [(ngModel)]="confirmEmail" placeholder="your@email.com">
                </mat-form-field>
                <div class="confirm-actions">
                  <button mat-button class="cancel-btn" (click)="showDeleteConfirm = false; confirmEmail = ''">
                    Cancel
                  </button>
                  <button mat-flat-button class="confirm-delete-btn"
                    [disabled]="confirmEmail !== user?.email || deleting"
                    (click)="deleteAccount()">
                    {{ deleting ? 'Deleting...' : 'Permanently Delete' }}
                  </button>
                </div>
              </div>
            }
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 800px; margin: 0 auto; }
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .page-subtitle { color: var(--text-muted); font-size: 14px; margin: 4px 0 0; }

    .settings-grid { display: flex; flex-direction: column; gap: 16px; }

    .settings-card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 24px;
    }

    .card-header {
      display: flex; align-items: flex-start; gap: 14px;
      margin-bottom: 20px;
    }
    .card-icon {
      color: var(--accent); width: 22px; height: 22px;
      flex-shrink: 0; margin-top: 2px;
    }
    .card-header h3 {
      font-size: 16px; font-weight: 600; color: var(--text-primary);
      margin: 0 0 2px;
    }
    .card-desc { font-size: 13px; color: var(--text-muted); margin: 0; }

    /* Avatar */
    .avatar-section {
      display: flex; flex-direction: column; align-items: center;
      margin-bottom: 16px; gap: 8px;
    }
    .avatar-preview {
      width: 80px; height: 80px; border-radius: 50%;
      background: rgba(255,255,255,0.04);
      border: 2px solid rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; position: relative; overflow: hidden;
      transition: border-color 0.2s;
    }
    .avatar-preview:hover { border-color: var(--accent); }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initial {
      font-size: 28px; font-weight: 700; color: var(--accent);
      line-height: 1; user-select: none;
    }
    .avatar-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s;
    }
    .avatar-preview:hover .avatar-overlay { opacity: 1; }
    .avatar-overlay mat-icon { color: #fff; width: 20px; height: 20px; }
    .avatar-actions { display: flex; align-items: center; gap: 10px; }
    .avatar-hint { font-size: 11px; color: var(--text-muted); }
    .avatar-remove {
      background: none; border: none; color: #ff5252;
      font-size: 11px; font-weight: 600; cursor: pointer;
      padding: 0;
    }
    .avatar-remove:hover { text-decoration: underline; }

    .settings-form { display: flex; flex-direction: column; gap: 4px; }
    .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
    mat-form-field { width: 100%; }
    .password-info { font-size: 12px; color: var(--text-muted); margin: 0 0 12px; line-height: 1.5; }

    .save-btn {
      align-self: flex-start;
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 600; font-size: 13px; border-radius: 10px;
      padding: 0 24px; height: 40px;
    }
    .save-btn:disabled { opacity: 0.4; }

    /* Toggles */
    .toggle-group { display: flex; flex-direction: column; gap: 4px; }
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .toggle-row:last-child { border-bottom: none; }
    .toggle-info { display: flex; flex-direction: column; }
    .toggle-label { font-size: 14px; font-weight: 500; color: var(--text-primary); }
    .toggle-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

    :host ::ng-deep .mat-mdc-slide-toggle {
      --mdc-switch-selected-track-color: var(--accent) !important;
      --mdc-switch-selected-pressed-track-color: var(--accent) !important;
      --mdc-switch-selected-hover-track-color: var(--accent) !important;
      --mdc-switch-selected-focus-track-color: var(--accent) !important;
      --mdc-switch-selected-handle-color: #fff !important;
      --mdc-switch-selected-hover-handle-color: #fff !important;
      --mdc-switch-selected-pressed-handle-color: #fff !important;
      --mdc-switch-selected-focus-handle-color: #fff !important;
      --mdc-switch-unselected-track-color: rgba(255,255,255,0.12) !important;
      --mdc-switch-unselected-hover-track-color: rgba(255,255,255,0.18) !important;
      --mdc-switch-unselected-pressed-track-color: rgba(255,255,255,0.18) !important;
      --mdc-switch-unselected-handle-color: rgba(255,255,255,0.5) !important;
      --mdc-switch-unselected-hover-handle-color: rgba(255,255,255,0.6) !important;
      --mdc-switch-unselected-pressed-handle-color: rgba(255,255,255,0.6) !important;
      --mdc-switch-selected-icon-color: transparent !important;
      --mdc-switch-unselected-icon-color: transparent !important;
      --mdc-switch-selected-icon-size: 0 !important;
      --mdc-switch-unselected-icon-size: 0 !important;
    }
    :host ::ng-deep .mdc-switch__icons { display: none !important; }
    :host ::ng-deep .mdc-switch__icon { display: none !important; }

    /* Account info */
    .account-section { display: flex; flex-direction: column; gap: 0; }
    .info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .info-label { font-size: 14px; color: var(--text-muted); }
    .info-value { font-size: 14px; color: var(--text-primary); font-weight: 500; }
    .link-group { display: flex; flex-direction: column; gap: 0; margin-top: 8px; }
    .settings-link {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 0; color: var(--text-primary);
      text-decoration: none; font-size: 14px; font-weight: 500;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      transition: color 0.15s;
    }
    .settings-link:last-child { border-bottom: none; }
    .settings-link:hover { color: var(--accent); }
    .link-arrow { width: 16px; height: 16px; color: var(--text-muted); }

    /* Danger zone */
    .danger-card { border-color: rgba(255,82,82,0.15); }
    .danger-icon { color: #ff5252 !important; }
    .danger-title { color: #ff5252 !important; }
    .danger-text { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin: 0 0 16px; }
    .delete-btn {
      border-color: #ff5252 !important; color: #ff5252 !important;
      font-weight: 600; font-size: 13px; border-radius: 10px;
    }
    .delete-btn:hover { background: rgba(255,82,82,0.08) !important; }
    .delete-btn mat-icon { width: 16px; height: 16px; margin-right: 6px; }

    .delete-confirm { }
    .confirm-text { font-size: 14px; color: var(--text-primary); margin: 0 0 12px; font-weight: 500; }
    .confirm-input { width: 100%; }
    .confirm-actions { display: flex; gap: 12px; align-items: center; }
    .cancel-btn { color: var(--text-muted) !important; }
    .confirm-delete-btn {
      background: #ff5252 !important; color: #fff !important;
      font-weight: 600; font-size: 13px; border-radius: 10px;
    }
    .confirm-delete-btn:disabled { opacity: 0.4; }

    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
    }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  user: UserProfile | null = null;

  profileForm: FormGroup;
  nutritionForm: FormGroup;
  passwordForm: FormGroup;

  savingProfile = false;
  savingNutrition = false;
  savingPassword = false;
  showDeleteConfirm = false;
  confirmEmail = '';
  deleting = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  workoutReminders = localStorage.getItem('pref_workoutReminders') !== 'false';
  waterReminders = localStorage.getItem('pref_waterReminders') !== 'false';
  aiSuggestions = localStorage.getItem('pref_aiSuggestions') !== 'false';
  prCelebrations = localStorage.getItem('pref_prCelebrations') !== 'false';
  avatarPreviewUrl: string | null = localStorage.getItem('avatarUrl');
  private readonly namePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.pattern(this.namePattern)]],
      lastName: ['', [Validators.pattern(this.namePattern)]],
      bodyWeightLbs: [null],
      heightInches: [null],
      fitnessGoal: [''],
    });

    this.nutritionForm = this.fb.group({
      dailyCalorieTarget: [2000, [Validators.required, Validators.min(500), Validators.max(10000)]],
      dailyProteinTarget: [150, [Validators.required, Validators.min(10), Validators.max(500)]],
      dailyCarbTarget: [250, [Validators.required, Validators.min(10), Validators.max(1000)]],
      dailyFatTarget: [65, [Validators.required, Validators.min(10), Validators.max(500)]],
      dailyWaterGoalOz: [64, [Validators.required, Validators.min(8), Validators.max(300)]],
    });

    this.passwordForm = this.fb.group({
      currentPassword: [''],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', Validators.required],
    }, { validators: this.passwordsMatchValidator });

    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        this.user = user;
        this.syncPasswordRequirements();
        if (user) {
          const { firstName, lastName } = this.deriveNameParts(user);
          this.profileForm.patchValue({
            firstName,
            lastName,
            bodyWeightLbs: user.bodyWeightLbs,
            heightInches: user.heightInches,
            fitnessGoal: user.fitnessGoal,
          }, { emitEvent: false });
          this.profileForm.markAsPristine();

          this.nutritionForm.patchValue({
            dailyCalorieTarget: user.dailyCalorieTarget || 2000,
            dailyProteinTarget: user.dailyProteinTarget || 150,
            dailyCarbTarget: user.dailyCarbTarget || 250,
            dailyFatTarget: user.dailyFatTarget || 65,
            dailyWaterGoalOz: user.dailyWaterGoalOz || 64,
          }, { emitEvent: false });
          this.nutritionForm.markAsPristine();
        }
      });
  }

  get userInitial(): string {
    return (this.user?.firstName?.[0] ?? this.user?.displayName?.[0] ?? 'U').toUpperCase();
  }

  ngOnInit(): void {
    this.userService.getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: user => this.authService.updateCurrentUser(user),
        error: () => void 0,
      });
  }

  onPrefChange(key: string, value: boolean): void {
    localStorage.setItem('pref_' + key, String(value));
    this.snackBar.open('Preference saved', 'Close', { duration: 1500 });
  }

  onAvatarSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.snackBar.open('Image must be under 2MB', 'Close', { duration: 3000 });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreviewUrl = reader.result as string;
      localStorage.setItem('avatarUrl', this.avatarPreviewUrl!);
      this.snackBar.open('Profile photo saved', 'Close', { duration: 2000 });
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarPreviewUrl = null;
    localStorage.removeItem('avatarUrl');
    this.snackBar.open('Profile photo removed', 'Close', { duration: 2000 });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    const profilePayload = {
      firstName: this.normalizeOptionalName(values.firstName),
      lastName: this.normalizeOptionalName(values.lastName),
      bodyWeightLbs: this.toNullableNumber(values.bodyWeightLbs),
      heightInches: this.toNullableNumber(values.heightInches),
      fitnessGoal: this.normalizeOptionalText(values.fitnessGoal),
    };

    this.savingProfile = true;
    this.userService.updateProfile(profilePayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingProfile = false;
          this.profileForm.markAsPristine();
          this.snackBar.open('Profile updated', 'Close', { duration: 3000 });
        },
        error: (error) => {
          this.savingProfile = false;
          this.snackBar.open(error?.message || 'Failed to update profile', 'Close', { duration: 3000 });
        },
      });
  }

  savePassword(): void {
    this.syncPasswordRequirements();
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword = true;
    this.userService.changePassword({
      currentPassword: this.passwordForm.value.currentPassword || undefined,
      newPassword: this.passwordForm.value.newPassword,
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingPassword = false;
          this.passwordForm.reset({
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
          });
          this.passwordForm.markAsPristine();
          this.syncPasswordRequirements();
          this.snackBar.open('Password updated', 'Close', { duration: 3000 });
        },
        error: (error) => {
          this.savingPassword = false;
          this.snackBar.open(error?.message || 'Failed to update password', 'Close', { duration: 3500 });
        },
      });
  }

  saveNutrition(): void {
    if (this.nutritionForm.invalid) {
      this.nutritionForm.markAllAsTouched();
      return;
    }

    const values = this.nutritionForm.getRawValue();
    const nutritionPayload = {
      dailyCalorieTarget: this.toInteger(values.dailyCalorieTarget),
      dailyProteinTarget: this.toInteger(values.dailyProteinTarget),
      dailyCarbTarget: this.toInteger(values.dailyCarbTarget),
      dailyFatTarget: this.toInteger(values.dailyFatTarget),
      dailyWaterGoalOz: this.toNumber(values.dailyWaterGoalOz),
    };

    this.savingNutrition = true;
    this.userService.updateProfile(nutritionPayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingNutrition = false;
          this.nutritionForm.markAsPristine();
          this.snackBar.open('Nutrition targets updated', 'Close', { duration: 3000 });
        },
        error: (error) => {
          this.savingNutrition = false;
          this.snackBar.open(error?.message || 'Failed to update targets', 'Close', { duration: 3000 });
        },
      });
  }

  deleteAccount(): void {
    this.deleting = true;
    this.userService.deleteAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Account deleted. Goodbye.', 'Close', { duration: 4000 });
          this.authService.logout();
        },
        error: () => {
          this.deleting = false;
          this.snackBar.open('Failed to delete account', 'Close', { duration: 3000 });
        },
      });
  }

  private syncPasswordRequirements(): void {
    const currentPasswordControl = this.passwordForm.controls['currentPassword'];
    if (this.user?.hasPassword) {
      currentPasswordControl.setValidators([Validators.required]);
    } else {
      currentPasswordControl.clearValidators();
    }
    currentPasswordControl.updateValueAndValidity({ emitEvent: false });
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmNewPassword')?.value;
    if (!newPassword || !confirmPassword) {
      return null;
    }
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  private deriveNameParts(user: UserProfile): { firstName: string; lastName: string } {
    const firstName = this.normalizeOptionalName(user.firstName) ?? '';
    const lastName = this.normalizeOptionalName(user.lastName) ?? '';
    if (firstName || lastName) {
      return { firstName, lastName };
    }

    const displayName = this.normalizeOptionalText(user.displayName);
    if (!displayName) {
      return { firstName: '', lastName: '' };
    }

    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return { firstName: '', lastName: '' };
    }
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  private normalizeOptionalName(value: unknown): string | undefined {
    const normalized = this.normalizeOptionalText(value);
    return normalized ? normalized : undefined;
  }

  private normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private toNullableNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toInteger(value: unknown): number {
    return Math.round(this.toNumber(value));
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
