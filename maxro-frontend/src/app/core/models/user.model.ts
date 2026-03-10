export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  hasPassword: boolean;
  bodyWeightLbs: number | null;
  heightInches: number | null;
  fitnessGoal: string | null;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dailyCarbTarget: number;
  dailyFatTarget: number;
  dailyWaterGoalOz: number;
  dateOfBirth: string | null;
  gender: string | null;
  agreedToTerms: boolean;
  profileComplete: boolean;
  createdAt: string;
}

export interface UserProfileInput {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  bodyWeightLbs?: number;
  heightInches?: number;
  fitnessGoal?: string;
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbTarget?: number;
  dailyFatTarget?: number;
  dailyWaterGoalOz?: number;
  dateOfBirth?: string;
  gender?: string;
  agreedToTerms?: boolean;
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword: string;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface RegisterInput {
  email: string;
  password: string;
  /** Use displayName when server only supports displayName; otherwise firstName + lastName */
  displayName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  agreedToTerms?: boolean;
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbTarget?: number;
  dailyFatTarget?: number;
  dailyWaterGoalOz?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}
