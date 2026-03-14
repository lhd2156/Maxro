import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="legal-page">
      <div class="legal-header">
        <a routerLink="/" class="back-link"><mat-icon svgIcon="mx-chevron-left"></mat-icon> Back</a>
        <span class="brand-text">MAXRO</span>
      </div>
      <div class="legal-content">
        <h1>Terms of Service</h1>
        <p class="updated">Last updated: March 8, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using the MAXRO application ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>MAXRO is a fitness and nutrition tracking platform that allows users to log workouts, track personal records, monitor nutrition intake, and track water consumption. The Service is provided "as is" and "as available."</p>

        <h2>3. Account Registration</h2>
        <p>To use the Service, you must create an account. You agree to provide accurate, current, and complete information during registration. You are responsible for safeguarding your password and for all activities that occur under your account.</p>

        <h2>4. User Responsibilities</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any illegal or unauthorized purpose</li>
          <li>Attempt to gain unauthorized access to the Service or its systems</li>
          <li>Transmit any viruses, malware, or other harmful code</li>
          <li>Impersonate any person or entity</li>
          <li>Interfere with or disrupt the Service or its infrastructure</li>
        </ul>

        <h2>5. Health Disclaimer</h2>
        <p>MAXRO is not a medical device and does not provide medical advice. The information provided through the Service, including AI-generated suggestions, is for informational and educational purposes only. Always consult a qualified healthcare professional before starting any exercise or nutrition program.</p>

        <h2>6. Intellectual Property</h2>
        <p>All content, features, and functionality of the Service are owned by MAXRO and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute any part of the Service without prior written consent.</p>

        <h2>7. Data and Privacy</h2>
        <p>Your use of the Service is also governed by our <a routerLink="/privacy" class="link">Privacy Policy</a>. By using the Service, you consent to the collection and use of your data as described therein.</p>

        <h2>8. Termination</h2>
        <p>We reserve the right to suspend or terminate your account at any time for any reason, including violation of these Terms. Upon termination, your right to use the Service ceases immediately.</p>

        <h2>9. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, MAXRO shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>

        <h2>10. Changes to Terms</h2>
        <p>We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.</p>

        <h2>11. Contact</h2>
        <p>If you have any questions about these Terms, contact us at <strong>support&#64;maxro.app</strong>.</p>
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
    }
    .back-link:hover { color: var(--accent); }
    .brand-text { font-size: 18px; font-weight: 800; letter-spacing: 4px; color: var(--accent); }
    .legal-content { max-width: 720px; margin: 0 auto; }
    h1 { color: var(--text-primary); font-size: 28px; font-weight: 700; margin: 0 0 8px; }
    .updated { color: var(--text-muted); font-size: 13px; margin: 0 0 32px; }
    h2 { color: var(--text-primary); font-size: 16px; font-weight: 600; margin: 24px 0 8px; }
    p { color: var(--text-muted); font-size: 14px; line-height: 1.7; margin: 0 0 12px; }
    ul { color: var(--text-muted); font-size: 14px; line-height: 1.7; padding-left: 24px; margin: 0 0 12px; }
    .link { color: var(--accent); text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
  `],
})
export class TermsComponent {}
