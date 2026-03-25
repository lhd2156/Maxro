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
  private readonly storageKey = 'maxro.public-config';
  private config: PublicConfig = this.readStoredConfig();
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
          map(response => this.normalizeConfig(response)),
          tap(config => {
            this.config = config;
            this.storeConfig(config);
          }),
          catchError(() => {
            this.config = this.readStoredConfig();
            return of(this.config);
          }),
        ),
      ).then(() => void 0)
        .finally(() => {
          this.loadPromise = null;
        });
    }

    return this.loadPromise;
  }

  private normalizeConfig(response?: Partial<PublicConfig> | null): PublicConfig {
    return {
      googleClientId: (response?.googleClientId ?? '').trim(),
      spotifyClientId: (response?.spotifyClientId ?? '').trim(),
    };
  }

  private readStoredConfig(): PublicConfig {
    if (typeof localStorage === 'undefined') {
      return this.normalizeConfig();
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return this.normalizeConfig();
      }

      return this.normalizeConfig(JSON.parse(raw) as Partial<PublicConfig>);
    } catch {
      return this.normalizeConfig();
    }
  }

  private storeConfig(config: PublicConfig): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(config));
    } catch {
      // Ignore storage failures; the app can still use the in-memory config.
    }
  }
}
