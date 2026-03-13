import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule,
  ],
  template: `
    <div class="app-shell">
      <nav class="sidenav" [style.width.px]="sidenavWidth">
        <a class="brand" routerLink="/">
          @if (sidenavWidth > 120) {
            <div class="brand-full">
              <img src="favicon.svg" alt="Maxro" class="brand-logo" />
              <span class="brand-text">MAXRO</span>
            </div>
          } @else {
            <img src="favicon.svg" alt="Maxro" class="brand-logo-sm" />
          }
        </a>
        <div class="nav-items">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active-link"
               [routerLinkActiveOptions]="{ exact: item.exact }"
               class="nav-link"
               [matTooltip]="sidenavWidth <= 120 ? item.label : ''"
               matTooltipPosition="right">
              <mat-icon [svgIcon]="item.icon"></mat-icon>
              @if (sidenavWidth > 120) {
                <span class="nav-label">{{ item.label }}</span>
              }
            </a>
          }
        </div>
        <div class="resize-handle" (mousedown)="onResizeStart($event)"></div>
      </nav>

      <div class="main-area">
        <header class="topbar">
          <div class="topbar-spacer"></div>
          <div class="topbar-actions">
            <button mat-icon-button [matMenuTriggerFor]="profileMenu" class="profile-trigger">
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
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      width: 100%;
      min-width: 0;
      min-height: 100vh;
      height: 100vh;
      height: 100dvh;
      background: var(--bg-primary);
      overflow: hidden;
    }

    .sidenav {
      background: var(--bg-surface);
      padding-left: env(safe-area-inset-left);
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
      position: relative;
      min-width: 64px;
      max-width: 280px;
    }

    .brand {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
      text-decoration: none;
      cursor: pointer;
    }
    .brand-full {
      display: flex; align-items: center; gap: 10px;
    }
    .brand-logo { width: 28px; height: 28px; border-radius: 6px; }
    .brand-logo-sm { width: 30px; height: 30px; border-radius: 6px; }
    .brand-text {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 4px;
      color: var(--accent);
      white-space: nowrap;
    }

    .nav-items {
      flex: 1;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.15s ease;
      white-space: nowrap;
      cursor: pointer;
      border: none;
      background: none;
      font-family: inherit;
      font-size: 14px;
      width: 100%;
      overflow: hidden;
    }
    .nav-link mat-icon { flex-shrink: 0; }
    .nav-link:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.04);
    }

    .active-link {
      color: var(--accent) !important;
      background: rgba(200, 241, 53, 0.08) !important;
    }
    .active-link mat-icon { color: var(--accent); }

    .resize-handle {
      position: absolute;
      top: 0;
      right: -3px;
      width: 6px;
      height: 100%;
      cursor: col-resize;
      z-index: 10;
      transition: background 0.15s;
    }
    .resize-handle:hover,
    .resize-handle:active {
      background: var(--accent);
      opacity: 0.4;
    }

    .main-area {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      min-height: 52px;
      height: calc(52px + env(safe-area-inset-top));
      display: flex;
      align-items: center;
      padding: env(safe-area-inset-top) calc(24px + env(safe-area-inset-right)) 0 calc(24px + env(safe-area-inset-left));
      flex-shrink: 0;
      box-sizing: border-box;
    }
    .topbar-spacer { flex: 1; }
    .topbar-actions { display: flex; align-items: center; }

    .profile-trigger {
      width: 36px;
      height: 36px;
      padding: 0;
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
      width: 34px; height: 34px; border-radius: 50%; object-fit: cover;
    }
    .menu-avatar-img {
      width: 36px; height: 36px; border-radius: 50%; object-fit: cover;
    }

    .content {
      flex: 1;
      min-height: 0;
      min-width: 0;
      padding: 28px calc(32px + env(safe-area-inset-right)) calc(28px + env(safe-area-inset-bottom)) calc(32px + env(safe-area-inset-left));
      overflow-y: auto;
      overflow-x: hidden;
      animation: content-fade-in 0.2s ease-out;
    }
    @keyframes content-fade-in {
      from { opacity: 0.4; }
      to { opacity: 1; }
    }

    @media (max-width: 1200px) {
      .topbar {
      min-height: 52px;
      height: calc(52px + env(safe-area-inset-top));
      display: flex;
      align-items: center;
      padding: env(safe-area-inset-top) calc(24px + env(safe-area-inset-right)) 0 calc(24px + env(safe-area-inset-left));
      flex-shrink: 0;
      box-sizing: border-box;
    }
      .content {
      flex: 1;
      min-height: 0;
      min-width: 0;
      padding: 28px calc(32px + env(safe-area-inset-right)) calc(28px + env(safe-area-inset-bottom)) calc(32px + env(safe-area-inset-left));
      overflow-y: auto;
      overflow-x: hidden;
      animation: content-fade-in 0.2s ease-out;
    }
    }
    @media (max-width: 768px) {
      .content {
      flex: 1;
      min-height: 0;
      min-width: 0;
      padding: 28px calc(32px + env(safe-area-inset-right)) calc(28px + env(safe-area-inset-bottom)) calc(32px + env(safe-area-inset-left));
      overflow-y: auto;
      overflow-x: hidden;
      animation: content-fade-in 0.2s ease-out;
    }
    }
  `],
})
export class LayoutComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  sidenavWidth = 240;
  private resizing = false;
  private userSized = false;
  private userSnapshot: UserProfile | null = null;

  readonly navItems = [
    { route: '/dashboard', icon: 'mx-grid', label: 'Dashboard', exact: true },
    { route: '/workouts', icon: 'mx-dumbbell', label: 'Workouts', exact: false },
    { route: '/prs', icon: 'mx-trophy', label: 'PRs', exact: true },
    { route: '/nutrition', icon: 'mx-utensils', label: 'Nutrition', exact: true },
    { route: '/water', icon: 'mx-droplet', label: 'Water', exact: true },
    { route: '/analytics', icon: 'mx-chart-line', label: 'Analytics', exact: true },
  ];

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => this.userSnapshot = user);

    this.applyResponsiveSidebar(window.innerWidth);
  }

  get avatarUrl(): string | null {
    return localStorage.getItem('avatarUrl');
  }

  get userInitial(): string {
    return (this.userSnapshot?.firstName?.[0] ?? this.userSnapshot?.displayName?.[0] ?? 'U').toUpperCase();
  }

  get userName(): string {
    if (this.userSnapshot?.firstName && this.userSnapshot?.lastName) {
      return this.userSnapshot.firstName + ' ' + this.userSnapshot.lastName;
    }
    return this.userSnapshot?.displayName ?? 'User';
  }

  get userEmail(): string {
    return this.userSnapshot?.email ?? '';
  }

  onResizeStart(event: MouseEvent): void {
    event.preventDefault();
    this.resizing = true;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.resizing) return;
    const newWidth = Math.max(64, Math.min(280, event.clientX));
    this.sidenavWidth = newWidth;
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: UIEvent): void {
    this.applyResponsiveSidebar((event.target as Window).innerWidth);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (!this.resizing) return;
    this.resizing = false;
    this.userSized = true;
    if (this.sidenavWidth < 120) {
      this.sidenavWidth = 64;
    } else if (this.sidenavWidth < 200) {
      this.sidenavWidth = 240;
    }
  }

  logout(): void {
    this.authService.logout();
  }

  private applyResponsiveSidebar(viewportWidth: number): void {
    if (viewportWidth <= 900) {
      this.sidenavWidth = 64;
      return;
    }

    if (viewportWidth <= 1200) {
      this.sidenavWidth = 88;
      return;
    }

    if (!this.userSized) {
      this.sidenavWidth = 240;
    }
  }
}


