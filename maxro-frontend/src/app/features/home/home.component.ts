import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="home">
      <div class="bg-grid">
        @for (i of gridDots; track i) {
          <div class="grid-dot" [style.animation-delay]="i * 0.12 + 's'"></div>
        }
      </div>

      <header class="home-header">
        <a [routerLink]="brandRoute" class="logo-wrap">
          <span class="logo">MAXRO</span>
        </a>
        @if (isLoggedIn) {
          <div class="header-nav">
            <button type="button" [matMenuTriggerFor]="profileMenu" class="profile-trigger">
              @if (avatarUrl) {
                <img [src]="avatarUrl" alt="Profile" class="avatar-circle-img" />
              } @else {
                <div class="avatar-circle">{{ userInitial }}</div>
              }
            </button>
            <mat-menu #profileMenu="matMenu" class="profile-dropdown">
              <div class="menu-header">
                @if (avatarUrl) {
                  <img [src]="avatarUrl" alt="Profile" class="menu-avatar-img" />
                } @else {
                  <div class="menu-avatar">{{ userInitial }}</div>
                }
                <div class="menu-user-info">
                  <span class="menu-name">{{ userName }}</span>
                  <span class="menu-email">{{ userEmail }}</span>
                </div>
              </div>
              <div class="menu-divider"></div>
              <button mat-menu-item routerLink="/dashboard">
                <mat-icon svgIcon="mx-grid"></mat-icon>
                <span>Dashboard</span>
              </button>
              <button mat-menu-item routerLink="/settings">
                <mat-icon svgIcon="mx-settings"></mat-icon>
                <span>Settings</span>
              </button>
              <div class="menu-divider"></div>
              <button mat-menu-item (click)="logout()" class="logout-item">
                <mat-icon svgIcon="mx-sign-out"></mat-icon>
                <span>Sign Out</span>
              </button>
            </mat-menu>
          </div>
        } @else {
          <nav class="header-nav">
            <a routerLink="/login" class="nav-link">Sign In</a>
            <a routerLink="/register" mat-flat-button class="cta-sm">Get Started</a>
          </nav>
        }
      </header>

      <section class="hero fade-in">
        <h1 class="hero-title">
          Track. Lift.<br/>
          <span class="accent">Fuel. Repeat.</span>
        </h1>
        <p class="hero-sub">
          The all-in-one fitness platform for logging workouts, crushing PRs,
          tracking macros, and staying hydrated. Built for athletes who mean business.
        </p>
        <div class="hero-actions">
          <a [routerLink]="startRoute" mat-flat-button class="hero-cta">Start Free</a>
          <a [routerLink]="signInRoute" mat-stroked-button class="hero-secondary">Sign In</a>
        </div>
      </section>

      <section class="features slide-up">
        @for (feature of features; track feature.title) {
          <div class="feature-card">
            <mat-icon [svgIcon]="feature.icon" class="feature-icon"></mat-icon>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        }
      </section>

      <footer class="home-footer">
        <span class="footer-brand">MAXRO</span>
        <span class="footer-copy">&copy; 2026 MAXRO. Built for lifters.</span>
      </footer>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(32px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 0.02; }
      50% { opacity: 0.1; }
    }

    .home {
      min-height: 100vh;
      background: var(--bg-primary);
      position: relative;
      overflow: hidden;
    }

    .bg-grid {
      position: fixed; inset: 0;
      display: grid;
      grid-template-columns: repeat(16, 1fr);
      grid-template-rows: repeat(10, 1fr);
      gap: 24px; padding: 24px;
      pointer-events: none;
      z-index: 0;
    }
    .grid-dot {
      width: 3px; height: 3px; border-radius: 50%;
      background: var(--accent); opacity: 0.02;
      justify-self: center; align-self: center;
      animation: pulse-dot 5s ease-in-out infinite;
    }

    .home-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px calc(44px - (100vw - 100%)) 20px 40px;
      position: relative; z-index: 1;
    }
    .logo-wrap {
      display: inline-flex;
      flex-direction: column;
      gap: 2px;
      text-decoration: none;
    }
    .logo {
      font-size: 22px; font-weight: 900; letter-spacing: 4px; color: var(--accent);
      line-height: 1;
    }
    .header-nav { display: flex; align-items: center; gap: 16px; }
    .nav-link {
      color: var(--text-muted); font-size: 14px; font-weight: 600;
      text-decoration: none; transition: color 0.15s;
    }
    .nav-link:hover { color: var(--text-primary); }
    .cta-sm {
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; border-radius: 8px; font-size: 13px;
    }
    .profile-trigger {
      width: 38px;
      height: 38px;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      transition: background-color 0.15s ease, box-shadow 0.15s ease;
    }
    .profile-trigger:hover {
      background: rgba(255,255,255,0.07);
    }
    .profile-trigger:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px rgba(200,241,53,0.42);
    }
    .avatar-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(200,241,53,0.15);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      line-height: 1;
    }
    .avatar-circle-img {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
    }
    .menu-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(200,241,53,0.14);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
    }
    .menu-avatar-img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }
    .menu-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      min-width: 220px;
    }
    .menu-user-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .menu-name {
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 700;
      line-height: 1.2;
    }
    .menu-email {
      color: var(--text-muted);
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .menu-divider {
      height: 1px;
      background: rgba(255,255,255,0.07);
      margin: 4px 0;
    }

    .hero {
      text-align: center;
      padding: 120px 24px 80px;
      position: relative; z-index: 1;
      animation: fade-in 0.8s ease-out;
    }
    .hero-title {
      font-size: clamp(36px, 6vw, 72px);
      font-weight: 900;
      color: var(--text-primary);
      line-height: 1.1;
      margin: 0 0 24px;
      letter-spacing: -1px;
    }
    .accent { color: var(--accent); }
    .accent { color: var(--accent); }
    .hero-sub {
      font-size: 18px;
      color: var(--text-muted);
      max-width: 560px;
      margin: 0 auto 40px;
      line-height: 1.7;
    }
    .hero-actions { display: flex; gap: 16px; justify-content: center; }
    .hero-cta {
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; border-radius: 10px; height: 48px; padding: 0 32px;
      font-size: 15px;
    }
    .hero-secondary {
      border-color: rgba(255,255,255,0.15) !important;
      color: var(--text-primary) !important;
      border-radius: 10px; height: 48px; padding: 0 32px;
      font-size: 15px; font-weight: 600;
    }
    .hero-secondary:hover { border-color: var(--accent) !important; }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
      padding: 0 40px 100px;
      max-width: 1100px;
      margin: 0 auto;
      position: relative; z-index: 1;
      animation: slide-up 0.8s ease-out 0.3s both;
    }
    .feature-card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      padding: 28px;
      transition: border-color 0.2s;
    }
    .feature-card:hover { border-color: rgba(200,241,53,0.2); }
    .feature-icon {
      color: var(--accent); width: 28px; height: 28px; margin-bottom: 16px;
    }
    .feature-card h3 {
      font-size: 16px; font-weight: 700; color: var(--text-primary);
      margin: 0 0 8px;
    }
    .feature-card p {
      font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0;
    }

    .home-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 24px 40px;
      border-top: 1px solid rgba(255,255,255,0.04);
      position: relative; z-index: 1;
    }
    .footer-brand {
      font-size: 14px; font-weight: 800; letter-spacing: 3px; color: var(--accent);
    }
    .footer-copy { font-size: 13px; color: var(--text-muted); }
  `],
})
export class HomeComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private userSnapshot: UserProfile | null = null;

  gridDots = Array.from({ length: 160 }, (_, i) => i);

  readonly features = [
    { icon: 'mx-dumbbell', title: 'Workout Tracking', description: 'Log exercises, sets, reps, and weight. See your full history and track progress over time.' },
    { icon: 'mx-trophy', title: 'PR Detection', description: 'Automatic personal record tracking. Get celebrated every time you hit a new best.' },
    { icon: 'mx-utensils', title: 'Nutrition Logging', description: 'Search foods, log meals, and track your daily macros with precision.' },
    { icon: 'mx-droplet', title: 'Water Intake', description: 'Stay hydrated. Track glasses throughout the day and hit your daily goal.' },
    { icon: 'mx-chart-line', title: 'Analytics', description: 'Strength trends, macro patterns, and consistency charts to fuel your progress.' },
    { icon: 'mx-flame', title: 'Streaks', description: 'Build consistency with workout streaks. Stay motivated and never break the chain.' },
  ];

  constructor() {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => this.userSnapshot = user);
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get brandRoute(): string {
    return this.isLoggedIn ? '/dashboard' : '/';
  }

  get signInRoute(): string {
    return this.isLoggedIn ? '/dashboard' : '/login';
  }

  get startRoute(): string {
    return this.isLoggedIn ? '/dashboard' : '/register';
  }

  get avatarUrl(): string | null {
    return localStorage.getItem('avatarUrl');
  }

  get userInitial(): string {
    return (this.userSnapshot?.firstName?.[0] ?? this.userSnapshot?.displayName?.[0] ?? 'U').toUpperCase();
  }

  get userName(): string {
    if (this.userSnapshot?.firstName && this.userSnapshot?.lastName) {
      return `${this.userSnapshot.firstName} ${this.userSnapshot.lastName}`;
    }
    return this.userSnapshot?.displayName ?? 'User';
  }

  get userEmail(): string {
    return this.userSnapshot?.email ?? '';
  }

  logout(): void {
    this.authService.logout();
  }
}
