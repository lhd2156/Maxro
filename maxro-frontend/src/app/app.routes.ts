import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'oauth2/callback',
    loadComponent: () => import('./features/auth/oauth-callback/oauth-callback.component').then(m => m.OAuthCallbackComponent),
  },
  {
    path: 'complete-profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/complete-profile/complete-profile.component').then(m => m.CompleteProfileComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'workouts',
        loadComponent: () => import('./features/workouts/workout-history/workout-history.component').then(m => m.WorkoutHistoryComponent),
      },
      {
        path: 'workouts/log',
        loadComponent: () => import('./features/workouts/workout-log/workout-log.component').then(m => m.WorkoutLogComponent),
      },
      {
        path: 'prs',
        loadComponent: () => import('./features/workouts/pr-tracker/pr-tracker.component').then(m => m.PrTrackerComponent),
      },
      {
        path: 'nutrition',
        loadComponent: () => import('./features/nutrition/nutrition-log/nutrition-log.component').then(m => m.NutritionLogComponent),
      },
      {
        path: 'water',
        loadComponent: () => import('./features/water/water-tracker/water-tracker.component').then(m => m.WaterTrackerComponent),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/analytics-dashboard/analytics-dashboard.component').then(m => m.AnalyticsDashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/user-profile/user-profile.component').then(m => m.UserProfileComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
    ],
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/legal/terms.component').then(m => m.TermsComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/legal/privacy.component').then(m => m.PrivacyComponent),
  },
  { path: '**', redirectTo: '' },
];
