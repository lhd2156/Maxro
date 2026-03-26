import { of, throwError } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthPayload, UserProfile } from '../models/user.model';

function createJwt(secondsFromNow: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${header}.${payload}.signature`;
}

function createUser(): UserProfile {
  return {
    id: 'user-1',
    email: 'maxro@example.com',
    displayName: 'Max Ro',
    firstName: 'Max',
    lastName: 'Ro',
    hasPassword: true,
    bodyWeightLbs: null,
    heightInches: null,
    fitnessGoal: 'Build muscle',
    dailyCalorieTarget: 2500,
    dailyProteinTarget: 180,
    dailyCarbTarget: 260,
    dailyFatTarget: 70,
    dailyWaterGoalOz: 96,
    dateOfBirth: null,
    gender: null,
    agreedToTerms: true,
    profileComplete: true,
    createdAt: '2026-03-01T00:00:00Z',
  };
}

describe('AuthService', () => {
  let apollo: jasmine.SpyObj<Apollo> & { client: { clearStore: jasmine.Spy } };
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();

    apollo = Object.assign(
      jasmine.createSpyObj<Apollo>('Apollo', ['mutate']),
      { client: { clearStore: jasmine.createSpy('clearStore').and.returnValue(Promise.resolve()) } },
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('treats expired access tokens as logged out on cold start even with cached refresh state', () => {
    localStorage.setItem('accessToken', createJwt(-3600));
    localStorage.setItem('refreshToken', 'refresh-token');
    localStorage.setItem('user', JSON.stringify(createUser()));

    const service = new AuthService(apollo as unknown as Apollo, router);

    expect(service.isLoggedIn()).toBeFalse();
  });

  it('warms a cached session by refreshing expired tokens once', async () => {
    const refreshedPayload: AuthPayload = {
      accessToken: createJwt(3600),
      refreshToken: 'new-refresh-token',
      user: createUser(),
    };

    localStorage.setItem('accessToken', createJwt(-3600));
    localStorage.setItem('refreshToken', 'refresh-token');
    localStorage.setItem('user', JSON.stringify(createUser()));
    apollo.mutate.and.returnValue(of({ loading: false, data: { refreshToken: refreshedPayload } }));

    const service = new AuthService(apollo as unknown as Apollo, router);

    service.warmSession();
    await Promise.resolve();

    expect(apollo.mutate).toHaveBeenCalledTimes(1);
    expect(service.isLoggedIn()).toBeTrue();
    expect(localStorage.getItem('accessToken')).toBe(refreshedPayload.accessToken);
    expect(localStorage.getItem('refreshToken')).toBe(refreshedPayload.refreshToken);
  });

  it('clears cached auth when refresh fails during warmup', async () => {
    localStorage.setItem('accessToken', createJwt(-3600));
    localStorage.setItem('refreshToken', 'refresh-token');
    localStorage.setItem('user', JSON.stringify(createUser()));
    apollo.mutate.and.returnValue(throwError(() => new Error('refresh failed')));

    const service = new AuthService(apollo as unknown as Apollo, router);

    service.warmSession();
    await Promise.resolve();

    expect(service.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('navigates to login immediately on logout without waiting for Apollo store cleanup', () => {
    localStorage.setItem('accessToken', createJwt(3600));
    localStorage.setItem('refreshToken', 'refresh-token');
    localStorage.setItem('user', JSON.stringify(createUser()));
    apollo.mutate.and.returnValue(of({ loading: false, data: undefined }));
    apollo.client.clearStore.and.returnValue(new Promise(() => undefined));

    const service = new AuthService(apollo as unknown as Apollo, router);

    service.logout();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
