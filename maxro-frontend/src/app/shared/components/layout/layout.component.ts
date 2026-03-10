import { Component, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';

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
              <button mat-menu-item routerLink="/profile">
                <mat-icon svgIcon="mx-user"></mat-icon>
                <span>Profile</span>
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
      height: 100vh;
      background: var(--bg-primary);
    }

    .sidenav {
      background: var(--bg-surface);
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
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      height: 52px;
      display: flex;
      align-items: center;
      padding: 0 24px;
      flex-shrink: 0;
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
      padding: 28px 32px;
      overflow-y: auto;
      animation: content-fade-in 0.2s ease-out;
    }
    @keyframes content-fade-in {
      from { opacity: 0.4; }
      to { opacity: 1; }
    }

    @media (max-width: 768px) {
      .content { padding: 16px; }
    }
  `],
})
export class LayoutComponent {
  sidenavWidth = 240;
  private resizing = false;

  readonly navItems = [
    { route: '/dashboard', icon: 'mx-grid', label: 'Dashboard', exact: true },
    { route: '/workouts', icon: 'mx-dumbbell', label: 'Workouts', exact: false },
    { route: '/prs', icon: 'mx-trophy', label: 'PRs', exact: true },
    { route: '/nutrition', icon: 'mx-utensils', label: 'Nutrition', exact: true },
    { route: '/water', icon: 'mx-droplet', label: 'Water', exact: true },
    { route: '/analytics', icon: 'mx-chart-line', label: 'Analytics', exact: true },
  ];

  constructor(private readonly authService: AuthService) {}

  get avatarUrl(): string | null {
    return localStorage.getItem('avatarUrl');
  }

  get userInitial(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return (user?.firstName?.[0] ?? user?.displayName?.[0] ?? 'U').toUpperCase();
  }

  get userName(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.firstName && user?.lastName) return user.firstName + ' ' + user.lastName;
    return user?.displayName ?? 'User';
  }

  get userEmail(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.email ?? '';
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

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (!this.resizing) return;
    this.resizing = false;
    if (this.sidenavWidth < 120) {
      this.sidenavWidth = 64;
    } else if (this.sidenavWidth < 200) {
      this.sidenavWidth = 240;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
