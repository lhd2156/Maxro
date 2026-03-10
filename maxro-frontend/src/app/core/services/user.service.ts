import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, tap } from 'rxjs';
import { ChangePasswordInput, UserProfile, UserProfileInput } from '../models/user.model';
import { AuthService } from './auth.service';

const USER_FIELDS = `
  id email displayName firstName lastName hasPassword bodyWeightLbs heightInches fitnessGoal
  dailyCalorieTarget dailyProteinTarget dailyCarbTarget dailyFatTarget
  dailyWaterGoalOz dateOfBirth gender agreedToTerms profileComplete createdAt
`;

const GET_ME = gql`
  query Me { me { ${USER_FIELDS} } }
`;

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UserProfileInput!) {
    updateProfile(input: $input) { ${USER_FIELDS} }
  }
`;

const DELETE_ACCOUNT = gql`
  mutation DeleteAccount { deleteAccount }
`;

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) { ${USER_FIELDS} }
  }
`;

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(
    private readonly apollo: Apollo,
    private readonly authService: AuthService,
  ) {}

  getProfile(): Observable<UserProfile> {
    return this.apollo.query<{ me: UserProfile }>({
      query: GET_ME,
    }).pipe(map(r => r.data.me));
  }

  updateProfile(input: UserProfileInput): Observable<UserProfile> {
    return this.apollo.mutate<{ updateProfile: UserProfile }>({
      mutation: UPDATE_PROFILE,
      variables: { input },
    }).pipe(
      map(r => r.data!.updateProfile),
      tap(user => this.authService.updateCurrentUser(user)),
    );
  }

  changePassword(input: ChangePasswordInput): Observable<UserProfile> {
    return this.apollo.mutate<{ changePassword: UserProfile }>({
      mutation: CHANGE_PASSWORD,
      variables: { input },
    }).pipe(
      map(r => r.data!.changePassword),
      tap(user => this.authService.updateCurrentUser(user)),
    );
  }

  deleteAccount(): Observable<boolean> {
    return this.apollo.mutate<{ deleteAccount: boolean }>({
      mutation: DELETE_ACCOUNT,
    }).pipe(map(r => r.data!.deleteAccount));
  }
}
