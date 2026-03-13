import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublicConfigService } from './public-config.service';

interface SpotifyTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
}

interface SpotifyTrackResponse {
  id?: string;
  name?: string;
  duration_ms?: number;
  external_urls?: { spotify?: string };
  album?: { name?: string; images?: Array<{ url: string }> };
  artists?: Array<{ name: string }>;
}

interface SpotifyPlaybackResponse {
  is_playing?: boolean;
  progress_ms?: number;
  shuffle_state?: boolean;
  repeat_state?: SpotifyRepeatMode;
  device?: { id?: string | null; is_active?: boolean; name?: string; type?: string } | null;
  item?: SpotifyTrackResponse | null;
  actions?: { disallows?: Record<string, boolean> };
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
  savedToLibrary: boolean;
}

@Injectable({ providedIn: 'root' })
export class SpotifyService {
  private readonly http = inject(HttpClient);
  private readonly publicConfig = inject(PublicConfigService);
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/api/spotify`;
  private readonly sessionKeyPrefix = 'spotifySession';
  private readonly legacySessionKey = 'spotifySession';
  private readonly stateKey = 'spotifyOAuthState';
  private readonly authErrorKey = 'spotifyAuthError';
  private readonly playbackCacheKeyPrefix = 'spotifyPlayback';
  private readonly scopes = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-read-recently-played',
    'user-library-read',
    'user-library-modify',
    'user-modify-playback-state',
  ].join(' ');

  get isConfigured(): boolean {
    return !!this.publicConfig.spotifyClientId;
  }

  get redirectUri(): string {
    const configuredRedirectUri = environment.spotifyRedirectUri?.trim();
    if (configuredRedirectUri) return configuredRedirectUri;
    if (typeof window !== 'undefined' && window.location?.origin) return `${window.location.origin}/auth/spotify-callback`;
    return '/auth/spotify-callback';
  }

  isConnected(): boolean {
    return !!this.getStoredSession();
  }

  canManageSavedTracks(): boolean {
    return this.sessionHasScope('user-library-modify');
  }

  beginAuthorization(): void {
    if (!this.isConfigured) throw new Error('Spotify Client ID is missing');
    const state = this.createState();
    sessionStorage.setItem(this.stateKey, state);
    sessionStorage.removeItem(this.authErrorKey);

    const params = new URLSearchParams({
      client_id: this.publicConfig.spotifyClientId,
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

    return this.http.post<SpotifyTokenResponse>(`${this.apiBaseUrl}/token`, { code, redirectUri: this.redirectUri }, { headers: this.createBackendHeaders() }).pipe(
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
    if (message) sessionStorage.removeItem(this.authErrorKey);
    return message;
  }

  disconnect(): void {
    const sessionKey = this.getSessionStorageKey();
    const playbackCacheKey = this.getPlaybackCacheKey();
    if (sessionKey) localStorage.removeItem(sessionKey);
    if (playbackCacheKey) localStorage.removeItem(playbackCacheKey);
    localStorage.removeItem(this.legacySessionKey);
    sessionStorage.removeItem(this.stateKey);
    sessionStorage.removeItem(this.authErrorKey);
  }

  getCachedPlaybackState(): SpotifyPlaybackState | null {
    const playbackCacheKey = this.getPlaybackCacheKey();
    if (!playbackCacheKey) return null;
    const raw = localStorage.getItem(playbackCacheKey);
    if (!raw) return null;
    try {
      const cached = JSON.parse(raw) as SpotifyPlaybackState;
      const looksLive = !!(
        cached?.track && (
          cached.isPlaying ||
          cached.progressMs > 0 ||
          cached.deviceId ||
          cached.deviceName ||
          cached.canPause ||
          cached.canResume ||
          cached.canSkipNext ||
          cached.canSkipPrevious ||
          cached.canToggleShuffle ||
          cached.canToggleRepeat
        )
      );
      if (!looksLive) {
        localStorage.removeItem(playbackCacheKey);
        return null;
      }
      return cached;
    } catch {
      localStorage.removeItem(playbackCacheKey);
      return null;
    }
  }

  getPlaybackState(): Observable<SpotifyPlaybackState | null> {
    return this.ensureValidAccessToken().pipe(
      switchMap(token => this.loadPlaybackState(token)),
      tap(state => this.cachePlaybackState(state)),
      catchError(error => {
        if (error.status === 401) {
          return this.refreshAccessToken().pipe(
            switchMap(response => this.loadPlaybackState(response.accessToken)),
            tap(state => this.cachePlaybackState(state)),
          );
        }
        if (error.status === 403) {
          return of(null);
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

  play(deviceId: string | null = null): Observable<void> { return this.sendPlayerCommand('PUT', this.withDeviceId('https://api.spotify.com/v1/me/player/play', deviceId)); }
  pause(deviceId: string | null = null): Observable<void> { return this.sendPlayerCommand('PUT', this.withDeviceId('https://api.spotify.com/v1/me/player/pause', deviceId)); }
  nextTrack(deviceId: string | null = null): Observable<void> { return this.sendPlayerCommand('POST', this.withDeviceId('https://api.spotify.com/v1/me/player/next', deviceId)); }
  previousTrack(deviceId: string | null = null): Observable<void> { return this.sendPlayerCommand('POST', this.withDeviceId('https://api.spotify.com/v1/me/player/previous', deviceId)); }
  setShuffle(enabled: boolean, deviceId: string | null = null): Observable<void> { return this.sendPlayerCommand('PUT', this.withDeviceId(`https://api.spotify.com/v1/me/player/shuffle?state=${enabled}`, deviceId)); }
  setRepeatMode(mode: SpotifyRepeatMode, deviceId: string | null = null): Observable<void> { return this.sendPlayerCommand('PUT', this.withDeviceId(`https://api.spotify.com/v1/me/player/repeat?state=${mode}`, deviceId)); }

  setTrackSaved(trackId: string, saved: boolean): Observable<void> {
    if (!trackId) return throwError(() => new Error('No Spotify track is available yet.'));
    if (!this.sessionHasScope('user-library-modify')) return throwError(() => new Error('Reconnect Spotify to save songs from your dashboard.'));

    return this.ensureValidAccessToken().pipe(
      switchMap(token => this.http.request(saved ? 'PUT' : 'DELETE', `https://api.spotify.com/v1/me/tracks?ids=${encodeURIComponent(trackId)}`, {
        headers: this.spotifyHeaders(token),
        responseType: 'text',
      })),
      map(() => void 0),
      catchError(error => {
        if (error.status === 401) return this.refreshAccessToken().pipe(switchMap(() => this.setTrackSaved(trackId, saved)));
        return throwError(() => error);
      }),
    );
  }

  private loadPlaybackState(token: string): Observable<SpotifyPlaybackState | null> {
    return this.fetchCurrentlyPlayingState(token).pipe(
      switchMap(currentlyPlayingState => this.fetchPlaybackSnapshot(token).pipe(
        map(playbackState => this.mergePlaybackStates(currentlyPlayingState, playbackState)),
        catchError(error => {
          if (error.status === 204 || error.status === 202 || error.status === 404 || error.status === 403) {
            return of(currentlyPlayingState);
          }
          return throwError(() => error);
        }),
      )),
      switchMap(state => {
        if (state?.track) {
          return this.enrichLibraryState(state, token);
        }
        return of(null);
      }),
      catchError(error => {
        if (error.status === 204 || error.status === 202 || error.status === 404 || error.status === 403) {
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }

  private fetchCurrentlyPlayingState(token: string): Observable<SpotifyPlaybackState | null> {
    if (!this.sessionHasScope('user-read-currently-playing')) return of(null);

    return this.http.get<SpotifyPlaybackResponse>('https://api.spotify.com/v1/me/player/currently-playing', { headers: this.spotifyHeaders(token) }).pipe(
      map(response => this.mapPlaybackState(response)),
      catchError(error => {
        if (error.status === 204 || error.status === 202 || error.status === 404 || error.status === 403) return of(null);
        return throwError(() => error);
      }),
    );
  }

  private fetchPlaybackSnapshot(token: string): Observable<SpotifyPlaybackState | null> {
    if (!this.sessionHasScope('user-read-playback-state')) return of(null);

    return this.http.get<SpotifyPlaybackResponse>('https://api.spotify.com/v1/me/player', { headers: this.spotifyHeaders(token) }).pipe(
      map(response => this.mapPlaybackState(response)),
      catchError(error => {
        if (error.status === 204 || error.status === 202 || error.status === 404 || error.status === 403) return of(null);
        return throwError(() => error);
      }),
    );
  }

  private mergePlaybackStates(currentlyPlayingState: SpotifyPlaybackState | null, playbackState: SpotifyPlaybackState | null): SpotifyPlaybackState | null {
    if (currentlyPlayingState?.track && playbackState) {
      return {
        ...playbackState,
        track: currentlyPlayingState.track,
        isPlaying: currentlyPlayingState.isPlaying,
        progressMs: currentlyPlayingState.progressMs,
        deviceId: playbackState.deviceId ?? currentlyPlayingState.deviceId,
        deviceName: playbackState.deviceName ?? currentlyPlayingState.deviceName,
        deviceType: playbackState.deviceType ?? currentlyPlayingState.deviceType,
      };
    }

    return playbackState ?? currentlyPlayingState;
  }

  private enrichLibraryState(state: SpotifyPlaybackState, token: string): Observable<SpotifyPlaybackState> {
    const trackId = state.track?.id;
    if (!trackId || !this.sessionHasScope('user-library-read')) return of(state);

    return this.http.get<boolean[]>(`https://api.spotify.com/v1/me/tracks/contains?ids=${encodeURIComponent(trackId)}`, { headers: this.spotifyHeaders(token) }).pipe(
      map(response => ({ ...state, savedToLibrary: !!response?.[0] })),
      catchError(() => of(state)),
    );
  }

  private sendPlayerCommand(method: 'PUT' | 'POST', url: string): Observable<void> {
    if (!this.sessionHasScope('user-modify-playback-state')) return throwError(() => new Error('Reconnect Spotify to enable playback controls.'));

    return this.ensureValidAccessToken().pipe(
      switchMap(token => this.http.request(method, url, { headers: this.spotifyHeaders(token), responseType: 'text' })),
      map(() => void 0),
      catchError(error => {
        if (error.status === 401) return this.refreshAccessToken().pipe(switchMap(() => this.sendPlayerCommand(method, url)));
        if (error.status === 403) return throwError(() => new Error('Spotify playback controls need an active Premium playback device.'));
        if (error.status === 404) return throwError(() => new Error('Open Spotify on a device and start playback first.'));
        return throwError(() => error);
      }),
    );
  }

  private withDeviceId(url: string, deviceId: string | null): string {
    if (!deviceId) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}device_id=${encodeURIComponent(deviceId)}`;
  }

  private ensureValidAccessToken(): Observable<string> {
    const session = this.getStoredSession();
    if (!session) return throwError(() => new Error('Spotify is not connected.'));
    if (Date.now() < session.expiresAt - 60_000) return of(session.accessToken);
    return this.refreshAccessToken().pipe(map(response => response.accessToken));
  }

  private refreshAccessToken(): Observable<SpotifyTokenResponse> {
    const session = this.getStoredSession();
    if (!session?.refreshToken) {
      this.disconnect();
      return throwError(() => new Error('Spotify session has expired.'));
    }

    return this.http.post<SpotifyTokenResponse>(`${this.apiBaseUrl}/refresh`, { refreshToken: session.refreshToken }, { headers: this.createBackendHeaders() }).pipe(
      tap(response => this.storeSession({ ...response, refreshToken: response.refreshToken || session.refreshToken })),
    );
  }

  private spotifyHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private createBackendHeaders(): HttpHeaders {
    const accessToken = localStorage.getItem('accessToken');
    return new HttpHeaders({ Authorization: `Bearer ${accessToken ?? ''}`, 'Content-Type': 'application/json' });
  }

  private getSessionStorageKey(): string | null {
    const userKey = this.getCurrentUserStorageKey();
    return userKey ? `${this.sessionKeyPrefix}:${userKey}` : null;
  }

  private getPlaybackCacheKey(): string | null {
    const userKey = this.getCurrentUserStorageKey();
    return userKey ? `${this.playbackCacheKeyPrefix}:${userKey}` : null;
  }

  private getCurrentUserStorageKey(): string | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw) as { id?: string; email?: string };
      const key = user?.id || user?.email;
      return key ? String(key).replace(/[^a-zA-Z0-9_-]/g, '_') : null;
    } catch {
      return null;
    }
  }

  private getStoredSession(): StoredSpotifySession | null {
    localStorage.removeItem(this.legacySessionKey);
    const sessionKey = this.getSessionStorageKey();
    if (!sessionKey) return null;
    const raw = localStorage.getItem(sessionKey);
    return raw ? JSON.parse(raw) as StoredSpotifySession : null;
  }

  private storeSession(response: SpotifyTokenResponse): void {
    const sessionKey = this.getSessionStorageKey();
    if (!sessionKey) throw new Error('Sign in again before connecting Spotify.');
    const existing = this.getStoredSession();
    const session: StoredSpotifySession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || existing?.refreshToken || '',
      expiresAt: Date.now() + (response.expiresIn * 1000),
      scope: response.scope || existing?.scope || '',
      tokenType: response.tokenType || existing?.tokenType || 'Bearer',
    };
    localStorage.removeItem(this.legacySessionKey);
    localStorage.setItem(sessionKey, JSON.stringify(session));
  }

  private cachePlaybackState(state: SpotifyPlaybackState | null): void {
    const playbackCacheKey = this.getPlaybackCacheKey();
    if (!playbackCacheKey) return;
    if (!state?.track) {
      localStorage.removeItem(playbackCacheKey);
      return;
    }
    const looksLive = !!(
      state.isPlaying ||
      state.progressMs > 0 ||
      state.deviceId ||
      state.deviceName ||
      state.canPause ||
      state.canResume ||
      state.canSkipNext ||
      state.canSkipPrevious ||
      state.canToggleShuffle ||
      state.canToggleRepeat
    );
    if (!looksLive) {
      localStorage.removeItem(playbackCacheKey);
      return;
    }
    localStorage.setItem(playbackCacheKey, JSON.stringify(state));
  }

  private extractErrorMessage(error: any, fallback: string): string {
    const payload = error?.error;
    if (typeof payload === 'string' && payload.trim()) return payload;
    return payload?.message || payload?.detail || payload?.error_description || payload?.error || error?.message || fallback;
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
    return !!this.getStoredSession()?.scope?.split(' ').includes(scope);
  }


  private mapPlaybackState(response: SpotifyPlaybackResponse | null): SpotifyPlaybackState | null {
    if (!response) return null;
    const disallows = response.actions?.disallows ?? {};
    return {
      track: this.mapTrack(response.item ?? null),
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
      savedToLibrary: false,
    };
  }

  private mapTrack(item: SpotifyTrackResponse | null): SpotifyTrack | null {
    if (!item?.name) return null;
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












