import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { AuthPayload, LoginInput, RegisterInput, UserProfile } from '../models/user.model';
import { Router } from '@angular/router';

const AUTH_FIELDS = `
  accessToken
  refreshToken
  user {
    id email displayName bodyWeightLbs heightInches fitnessGoal
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
    const token = localStorage.getItem('refreshToken');
    return this.apollo.mutate<{ refreshToken: AuthPayload }>({
      mutation: REFRESH_TOKEN_MUTATION,
      variables: { token },
    }).pipe(
      map(result => result.data!.refreshToken),
      tap(payload => this.storeAuth(payload)),
    );
  }

  logout(): void {
    this.apollo.mutate({ mutation: LOGOUT_MUTATION }).subscribe();
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  updateCurrentUser(user: UserProfile): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private storeAuth(payload: AuthPayload): void {
    localStorage.setItem('accessToken', payload.accessToken);
    localStorage.setItem('refreshToken', payload.refreshToken);
    localStorage.setItem('user', JSON.stringify(payload.user));
    this.currentUserSubject.next(payload.user);
  }

  private clearAuth(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  private loadUser(): UserProfile | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }
}
