import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { AuthPayload, LoginInput, RegisterInput, UserProfile } from '../models/user.model';
import { Router } from '@angular/router';

const AUTH_FIELDS = `
  accessToken
  refreshToken
  user {
    id email displayName firstName lastName hasPassword bodyWeightLbs heightInches fitnessGoal
    dailyCalorieTarget dailyProteinTarget dailyCarbTarget dailyFatTarget
    dailyWaterGoalOz dateOfBirth gender agreedToTerms profileComplete createdAt
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) { ${AUTH_FIELDS} }
  }
`;

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) { ${AUTH_FIELDS} }
  }
`;

const GOOGLE_SIGN_IN_MUTATION = gql`
  mutation GoogleSignIn($idToken: String!) {
    googleSignIn(idToken: $idToken) { ${AUTH_FIELDS} }
  }
`;

const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token) { ${AUTH_FIELDS} }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(this.loadUser());
  private sessionValidation$: Observable<boolean> | null = null;
  private sessionWarmupStarted = false;
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));

  constructor(private readonly apollo: Apollo, private readonly router: Router) {}

  register(input: RegisterInput): Observable<AuthPayload> {
    return this.apollo.mutate<{ register: AuthPayload }>({
      mutation: REGISTER_MUTATION,
      variables: { input },
    }).pipe(
      map(result => result.data!.register),
      tap(payload => this.storeAuth(payload)),
    );
  }

  login(input: LoginInput): Observable<AuthPayload> {
    return this.apollo.mutate<{ login: AuthPayload }>({
      mutation: LOGIN_MUTATION,
      variables: { input },
    }).pipe(
      map(result => result.data!.login),
      tap(payload => this.storeAuth(payload)),
    );
  }

  googleSignIn(idToken: string): Observable<AuthPayload> {
    return this.apollo.mutate<{ googleSignIn: AuthPayload }>({
      mutation: GOOGLE_SIGN_IN_MUTATION,
      variables: { idToken },
    }).pipe(
      map(result => result.data!.googleSignIn),
      tap(payload => this.storeAuth(payload)),
    );
  }

  refreshToken(): Observable<AuthPayload> {
    const token = this.getRefreshToken();
    return this.apollo.mutate<{ refreshToken: AuthPayload }>({
      mutation: REFRESH_TOKEN_MUTATION,
      variables: { token },
    }).pipe(
      map(result => result.data!.refreshToken),
      tap(payload => this.storeAuth(payload)),
    );
  }

  logout(): void {
    this.apollo.mutate({ mutation: LOGOUT_MUTATION, errorPolicy: 'all' }).subscribe({
      error: () => undefined,
    });

    this.clearAuth();
    void this.router.navigate(['/login']);
    void this.apollo.client.clearStore().catch(() => undefined);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isLoggedIn(): boolean {
    return this.hasValidAccessToken() && !!this.currentUserSubject.value;
  }

  warmSession(): void {
    if (this.sessionWarmupStarted) {
      return;
    }

    this.sessionWarmupStarted = true;
    void firstValueFrom(this.ensureValidSession()).catch(() => false);
  }

  ensureValidSession(): Observable<boolean> {
    if (this.hasValidAccessToken()) {
      return of(true);
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken || !this.currentUserSubject.value) {
      this.clearAuth();
      return of(false);
    }

    if (!this.sessionValidation$) {
      this.sessionValidation$ = this.refreshToken().pipe(
        map(() => true),
        catchError(() => {
          this.clearAuth();
          return of(false);
        }),
        finalize(() => {
          this.sessionValidation$ = null;
        }),
        shareReplay(1),
      );
    }

    return this.sessionValidation$;
  }

  updateCurrentUser(user: UserProfile): void {
    const normalizedUser = this.normalizeUser(user);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    this.currentUserSubject.next(normalizedUser);
  }

  private storeAuth(payload: AuthPayload): void {
    const normalizedUser = this.normalizeUser(payload.user);
    localStorage.setItem('accessToken', payload.accessToken);
    localStorage.setItem('refreshToken', payload.refreshToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    this.currentUserSubject.next(normalizedUser);
  }

  private clearAuth(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.sessionValidation$ = null;
    this.currentUserSubject.next(null);
  }

  private loadUser(): UserProfile | null {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return null;
    }

    try {
      const user = JSON.parse(raw) as UserProfile;
      return this.normalizeUser(user);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }

  private normalizeUser(user: UserProfile): UserProfile {
    const firstName = this.normalizeOptionalName(user.firstName);
    const lastName = this.normalizeOptionalName(user.lastName);
    const normalizedDisplayName = this.normalizeOptionalName(user.displayName);
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || normalizedDisplayName || user.displayName || '';

    return {
      ...user,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      displayName,
      hasPassword: user.hasPassword ?? true,
    };
  }

  private normalizeOptionalName(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const compact = value.trim().replace(/\s+/g, ' ');
    if (!compact) {
      return undefined;
    }

    return compact
      .toLowerCase()
      .replace(/(^|[\s'-])([a-z])/g, (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
  }

  private hasValidAccessToken(): boolean {
    const accessToken = this.getAccessToken();
    return !!accessToken && !this.isTokenExpired(accessToken);
  }

  private isTokenExpired(token: string, bufferSeconds = 30): boolean {
    const payload = this.parseJwtPayload(token);
    const expiresAt = typeof payload?.['exp'] === 'number'
      ? payload['exp'] * 1000
      : null;

    if (!expiresAt) {
      return false;
    }

    return expiresAt <= Date.now() + (bufferSeconds * 1000);
  }

  private parseJwtPayload(token: string): Record<string, unknown> | null {
    const segments = token.split('.');
    if (segments.length < 2 || typeof atob !== 'function') {
      return null;
    }

    try {
      const base64 = segments[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(segments[1].length / 4) * 4, '=');

      return JSON.parse(atob(base64)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
