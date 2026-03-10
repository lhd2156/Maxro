import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { take } from 'rxjs';

/**
 * Handles OAuth2 redirect callback (e.g. http://localhost:4200/oauth2/callback).
 * For Google One Tap, the credential is returned in JS—no redirect. This route
 * exists for redirect-based flows: if id_token is in the URL, we exchange it
 * and redirect to dashboard; otherwise redirect to login.
 */
@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="oauth-callback"><p>Signing you in...</p></div>`,
  styles: [`
    .oauth-callback {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary);
      color: var(--text-muted);
      font-size: 14px;
    }
  `],
})
export class OAuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const fragment = this.route.snapshot.fragment;
    const queryParams = this.route.snapshot.queryParams;
    const idToken = queryParams['id_token'] ?? queryParams['credential'] ?? this.parseIdTokenFromFragment(fragment);

    if (idToken) {
      this.authService.googleSignIn(idToken).pipe(take(1)).subscribe({
        next: (payload) => {
          if (!payload.user.profileComplete) {
            this.router.navigate(['/complete-profile']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: () => this.router.navigate(['/login']),
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  private parseIdTokenFromFragment(fragment: string | null): string | null {
    if (!fragment) return null;
    const params = new URLSearchParams(fragment);
    return params.get('id_token') ?? params.get('credential');
  }
}
