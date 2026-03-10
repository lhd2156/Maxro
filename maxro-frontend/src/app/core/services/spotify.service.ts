import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

interface SpotifyTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
}

interface SpotifyPlaybackResponse {
  is_playing?: boolean;
  progress_ms?: number;
  shuffle_state?: boolean;
  repeat_state?: SpotifyRepeatMode;
  device?: {
    id?: string | null;
    is_active?: boolean;
    is_private_session?: boolean;
    name?: string;
    type?: string;
  } | null;
  item?: {
    id?: string;
    name?: string;
    duration_ms?: number;
    external_urls?: { spotify?: string };
    album?: {
      name?: string;
      images?: Array<{ url: string }>;
    };
    artists?: Array<{ name: string }>;
  } | null;
  actions?: {
    disallows?: Record<string, boolean>;
  };
}

interface StoredSpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
}

export type SpotifyRepeatMode = 'off' | 'context' | 'track';

export interface SpotifyTrack {
  id: string | null;
  name: string;
  artistNames: string[];
  albumName: string;
  albumImageUrl: string | null;
  externalUrl: string | null;
  durationMs: number;
}

export interface SpotifyPlaybackState {
  track: SpotifyTrack | null;
  isPlaying: boolean;
  progressMs: number;
  shuffleEnabled: boolean;
  repeatMode: SpotifyRepeatMode;
  deviceId: string | null;
  deviceName: string | null;
  deviceType: string | null;
  canPause: boolean;
  canResume: boolean;
  canSkipPrevious: boolean;
  canSkipNext: boolean;
  canToggleShuffle: boolean;
  canToggleRepeat: boolean;
}

@Injectable({ providedIn: 'root' })
export class SpotifyService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/api/spotify`;
  private readonly sessionKeyPrefix = 'spotifySession';
  private readonly legacySessionKey = 'spotifySession';
  private readonly stateKey = 'spotifyOAuthState';
  private readonly authErrorKey = 'spotifyAuthError';
  private readonly scopes = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-modify-playback-state',
  ].join(' ');

  get isConfigured(): boolean {
    return !!environment.spotifyClientId;
  }

  get redirectUri(): string {
    return environment.spotifyRedirectUri;
  }

  isConnected(): boolean {
    return !!this.getStoredSession();
  }

  beginAuthorization(): void {
    if (!this.isConfigured) {
      throw new Error('Spotify Client ID is missing');
    }

    const state = this.createState();
    sessionStorage.setItem(this.stateKey, state);
    sessionStorage.removeItem(this.authErrorKey);

    const params = new URLSearchParams({
      client_id: environment.spotifyClientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state,
      show_dialog: 'true',
    });

    window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
  }

  completeAuthorization(code: string, state: string | null): Observable<void> {
    const expectedState = sessionStorage.getItem(this.stateKey);
    if (!state || !expectedState || state !== expectedState) {
      this.setPendingAuthError('Spotify authorization expired. Please try again.');
      return throwError(() => new Error('Spotify authorization state did not match.'));
    }

    return this.http.post<SpotifyTokenResponse>(`${this.apiBaseUrl}/token`, {
      code,
      redirectUri: this.redirectUri,
    }, {
      headers: this.createBackendHeaders(),
    }).pipe(
      tap(response => {
        sessionStorage.removeItem(this.stateKey);
        sessionStorage.removeItem(this.authErrorKey);
        this.storeSession(response);
      }),
      map(() => void 0),
      catchError(error => {
        const message = this.extractErrorMessage(error, 'Spotify could not finish connecting.');
        this.setPendingAuthError(message);
        return throwError(() => new Error(message));
      }),
    );
  }

  consumePendingAuthError(): string | null {
    const message = sessionStorage.getItem(this.authErrorKey);
    if (message) {
      sessionStorage.removeItem(this.authErrorKey);
    }
    return message;
  }

  disconnect(): void {
    const sessionKey = this.getSessionStorageKey();
    if (sessionKey) {
      localStorage.removeItem(sessionKey);
    }
    localStorage.removeItem(this.legacySessionKey);
    sessionStorage.removeItem(this.stateKey);
    sessionStorage.removeItem(this.authErrorKey);
  }

  getPlaybackState(): Observable<SpotifyPlaybackState | null> {
    return this.ensureValidAccessToken().pipe(
      switchMap(token => this.http.get<SpotifyPlaybackResponse>(
        'https://api.spotify.com/v1/me/player',
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
      )),
      map(response => this.mapPlaybackState(response)),
      catchError(error => {
        if (error.status === 204 || error.status === 202 || error.status === 404) {
          return of(null);
        }
        if (error.status === 401) {
          return this.refreshAccessToken().pipe(switchMap(() => this.getPlaybackState()));
        }
        if (error.status === 403) {
          return throwError(() => new Error('Spotify playback controls require an active Premium playback device.'));
        }
        return throwError(() => error);
      }),
    );
  }

  getCurrentTrack(): Observable<SpotifyTrack | null> {
    return this.getPlaybackState().pipe(map(state => state?.track ?? null));
  }

  togglePlayback(state: SpotifyPlaybackState | null): Observable<void> {
    const deviceId = state?.deviceId ?? null;
    return state?.isPlaying ? this.pause(deviceId) : this.play(deviceId);
  }

  play(deviceId: string | null = null): Observable<void> {
    return this.sendPlayerCommand('PUT', this.withDeviceId('https://api.spotify.com/v1/me/player/play', deviceId));
  }

  pause(deviceId: string | null = null): Observable<void> {
    return this.sendPlayerCommand('PUT', this.withDeviceId('https://api.spotify.com/v1/me/player/pause', deviceId));
  }

  nextTrack(deviceId: string | null = null): Observable<void> {
    return this.sendPlayerCommand('POST', this.withDeviceId('https://api.spotify.com/v1/me/player/next', deviceId));
  }

  previousTrack(deviceId: string | null = null): Observable<void> {
    return this.sendPlayerCommand('POST', this.withDeviceId('https://api.spotify.com/v1/me/player/previous', deviceId));
  }

  setShuffle(enabled: boolean, deviceId: string | null = null): Observable<void> {
    return this.sendPlayerCommand('PUT', this.withDeviceId(`https://api.spotify.com/v1/me/player/shuffle?state=${enabled}`, deviceId));
  }

  setRepeatMode(mode: SpotifyRepeatMode, deviceId: string | null = null): Observable<void> {
    return this.sendPlayerCommand('PUT', this.withDeviceId(`https://api.spotify.com/v1/me/player/repeat?state=${mode}`, deviceId));
  }

  private sendPlayerCommand(method: 'PUT' | 'POST', url: string): Observable<void> {
    if (!this.sessionHasScope('user-modify-playback-state')) {
      return throwError(() => new Error('Reconnect Spotify to enable playback controls.'));
    }

    return this.ensureValidAccessToken().pipe(
      switchMap(token => this.http.request(method, url, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        responseType: 'text',
      })),
      map(() => void 0),
      catchError(error => {
        if (error.status === 401) {
          return this.refreshAccessToken().pipe(switchMap(() => this.sendPlayerCommand(method, url)));
        }
        if (error.status === 403) {
          return throwError(() => new Error('Spotify playback controls need an active Premium playback device.'));
        }
        if (error.status === 404) {
          return throwError(() => new Error('Open Spotify on a device and start playback first.'));
        }
        return throwError(() => error);
      }),
    );
  }

  private withDeviceId(url: string, deviceId: string | null): string {
    if (!deviceId) {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}device_id=${encodeURIComponent(deviceId)}`;
  }

  private ensureValidAccessToken(): Observable<string> {
    const session = this.getStoredSession();
    if (!session) {
      return throwError(() => new Error('Spotify is not connected.'));
    }

    if (Date.now() < session.expiresAt - 60_000) {
      return of(session.accessToken);
    }

    return this.refreshAccessToken().pipe(map(response => response.accessToken));
  }

  private refreshAccessToken(): Observable<SpotifyTokenResponse> {
    const session = this.getStoredSession();
    if (!session?.refreshToken) {
      this.disconnect();
      return throwError(() => new Error('Spotify session has expired.'));
    }

    return this.http.post<SpotifyTokenResponse>(`${this.apiBaseUrl}/refresh`, {
      refreshToken: session.refreshToken,
    }, {
      headers: this.createBackendHeaders(),
    }).pipe(
      tap(response => {
        this.storeSession({
          ...response,
          refreshToken: response.refreshToken || session.refreshToken,
        });
      }),
    );
  }

  private createBackendHeaders(): HttpHeaders {
    const accessToken = localStorage.getItem('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${accessToken ?? ''}`,
      'Content-Type': 'application/json',
    });
  }

  private getStoredSession(): StoredSpotifySession | null {
    const raw = localStorage.getItem(this.sessionKey);
    return raw ? JSON.parse(raw) as StoredSpotifySession : null;
  }

  private storeSession(response: SpotifyTokenResponse): void {
    const existing = this.getStoredSession();
    const session: StoredSpotifySession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || existing?.refreshToken || '',
      expiresAt: Date.now() + (response.expiresIn * 1000),
      scope: response.scope,
      tokenType: response.tokenType,
    };
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  private extractErrorMessage(error: any, fallback: string): string {
    const payload = error?.error;
    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    return payload?.message
      || payload?.detail
      || payload?.error_description
      || payload?.error
      || error?.message
      || fallback;
  }

  private createState(): string {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    return Array.from(buffer, value => value.toString(16).padStart(2, '0')).join('');
  }

  private setPendingAuthError(message: string): void {
    sessionStorage.setItem(this.authErrorKey, message);
  }

  private sessionHasScope(scope: string): boolean {
    const session = this.getStoredSession();
    return !!session?.scope?.split(' ').includes(scope);
  }

  private mapPlaybackState(response: SpotifyPlaybackResponse | null): SpotifyPlaybackState | null {
    if (!response) {
      return null;
    }

    const disallows = response.actions?.disallows ?? {};
    return {
      track: this.mapTrack(response.item),
      isPlaying: !!response.is_playing,
      progressMs: response.progress_ms ?? 0,
      shuffleEnabled: !!response.shuffle_state,
      repeatMode: response.repeat_state ?? 'off',
      deviceId: response.device?.id ?? null,
      deviceName: response.device?.name ?? null,
      deviceType: response.device?.type ?? null,
      canPause: !disallows['pausing'],
      canResume: !disallows['resuming'],
      canSkipPrevious: !disallows['skipping_prev'],
      canSkipNext: !disallows['skipping_next'],
      canToggleShuffle: !disallows['toggling_shuffle'],
      canToggleRepeat: !disallows['toggling_repeat_context'] && !disallows['toggling_repeat_track'],
    };
  }

  private mapTrack(item: SpotifyPlaybackResponse['item']): SpotifyTrack | null {
    if (!item?.name) {
      return null;
    }

    return {
      id: item.id ?? null,
      name: item.name,
      artistNames: item.artists?.map(artist => artist.name).filter(Boolean) ?? [],
      albumName: item.album?.name ?? '',
      albumImageUrl: item.album?.images?.[0]?.url ?? null,
      externalUrl: item.external_urls?.spotify ?? null,
      durationMs: item.duration_ms ?? 0,
    };
  }
}



