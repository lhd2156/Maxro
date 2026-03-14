import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Location } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="legal-page">
      <div class="legal-header">
        <button type="button" class="back-link" (click)="goBack()"><mat-icon svgIcon="mx-chevron-left"></mat-icon> Back</button>
        <span class="brand-text">MAXRO</span>
      </div>
      <div class="legal-content">
        <h1>Privacy Policy</h1>
        <p class="updated">Last updated: March 8, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly when creating an account and using the Service, including:</p>
        <ul>
          <li><strong>Account information:</strong> email address, display name, date of birth, gender</li>
          <li><strong>Profile data:</strong> body weight, height, fitness goals, daily targets</li>
          <li><strong>Activity data:</strong> workout logs, nutrition entries, water intake, personal records</li>
          <li><strong>Device information:</strong> browser type, operating system, and usage patterns</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Personalize your experience and deliver relevant suggestions</li>
          <li>Track your fitness and nutrition progress over time</li>
          <li>Send important notifications about your account or the Service</li>
          <li>Ensure the security and integrity of the platform</li>
        </ul>

        <h2>3. Data Storage and Security</h2>
        <p>Your data is stored on secure servers. We implement industry-standard security measures including encryption in transit and at rest, access controls, and regular security audits to protect your personal information.</p>

        <h2>4. Third-Party Services</h2>
        <p>We may integrate with third-party services such as Google (for authentication) and Spotify (for music playback). These services have their own privacy policies. We only share the minimum data necessary for these integrations to function.</p>

        <h2>5. Data Sharing</h2>
        <p>We do not sell, trade, or rent your personal information to third parties. We may share anonymized, aggregated data for analytics purposes.</p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access and download your personal data</li>
          <li>Correct inaccurate information</li>
          <li>Delete your account and associated data</li>
          <li>Opt out of non-essential communications</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>We use local storage and session tokens (JWT) to maintain your authentication state. We do not use third-party tracking cookies.</p>

        <h2>8. Children's Privacy</h2>
        <p>The Service is not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13.</p>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the updated policy on this page with a revised date.</p>

        <h2>10. Contact</h2>
        <p>If you have any questions about this Privacy Policy, contact us at <strong>privacy&#64;maxro.app</strong>.</p>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh; background: var(--bg-primary);
      padding: 24px;
    }
    .legal-header {
      max-width: 720px; margin: 0 auto 32px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .back-link {
      display: flex; align-items: center; gap: 4px;
      color: var(--text-muted); text-decoration: none; font-size: 14px; font-weight: 500;
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
      font: inherit;
      cursor: pointer;
    }
    .back-link:hover { color: var(--accent); }
    .brand-text { font-size: 18px; font-weight: 800; letter-spacing: 4px; color: var(--accent); }
    .legal-content { max-width: 720px; margin: 0 auto; }
    h1 { color: var(--text-primary); font-size: 28px; font-weight: 700; margin: 0 0 8px; }
    .updated { color: var(--text-muted); font-size: 13px; margin: 0 0 32px; }
    h2 { color: var(--text-primary); font-size: 16px; font-weight: 600; margin: 24px 0 8px; }
    p { color: var(--text-muted); font-size: 14px; line-height: 1.7; margin: 0 0 12px; }
    ul { color: var(--text-muted); font-size: 14px; line-height: 1.7; padding-left: 24px; margin: 0 0 12px; }
  `],
})
export class PrivacyComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigate([this.authService.isLoggedIn() ? '/dashboard' : '/']);
  }
}
