import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicConfig {
  googleClientId: string;
  spotifyClientId: string;
}

@Injectable({ providedIn: 'root' })
export class PublicConfigService {
  private readonly http = inject(HttpClient);
  private readonly configUrl = `${environment.apiBaseUrl}/api/public-config`;
  private config: PublicConfig = {
    googleClientId: '',
    spotifyClientId: '',
  };
  private loadPromise: Promise<void> | null = null;

  get googleClientId(): string {
    return this.config.googleClientId;
  }

  get spotifyClientId(): string {
    return this.config.spotifyClientId;
  }

  // Load public-only auth IDs once so the bundle does not need tracked client IDs.
  load(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = firstValueFrom(
        this.http.get<Partial<PublicConfig>>(this.configUrl).pipe(
          map(response => ({
            googleClientId: (response?.googleClientId ?? '').trim(),
            spotifyClientId: (response?.spotifyClientId ?? '').trim(),
          })),
          tap(config => {
            this.config = config;
          }),
          catchError(() => {
            this.config = { googleClientId: '', spotifyClientId: '' };
            return of(this.config);
          }),
        ),
      ).then(() => void 0);
    }

    return this.loadPromise;
  }
}