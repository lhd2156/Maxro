import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SpotifyService } from '../../../core/services/spotify.service';
import { catchError, of, switchMap, take } from 'rxjs';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="oauth-callback"><p>{{ statusMessage }}</p></div>`,
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
  statusMessage = 'Signing you in...';
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly spotifyService = inject(SpotifyService);

  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParams;

    if (queryParams['code']) {
      this.statusMessage = 'Connecting Spotify...';
      this.spotifyService.completeAuthorization(queryParams['code'], queryParams['state'] ?? null)
        .pipe(
          switchMap(() => this.spotifyService.getPlaybackState().pipe(catchError(() => of(null)))),
          take(1),
        )
        .subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: () => this.router.navigate(['/dashboard']),
        });
      return;
    }

    const fragment = this.route.snapshot.fragment;
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


