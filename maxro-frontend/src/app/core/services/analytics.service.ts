import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { DashboardSummary, StrengthDataPoint } from '../models/analytics.model';
import { MacroTrendPoint } from '../models/nutrition.model';
import { WaterTrendPoint } from '../models/water.model';

const GET_DASHBOARD_SUMMARY = gql`
  query GetDashboardSummary($date: String!) {
    getDashboardSummary(date: $date) {
      date
      workoutToday {
        id date notes exercises { name muscleGroup sets { reps weightLbs } }
      }
      nutritionToday {
        id date totalCalories totalProteinG totalCarbsG totalFatG
        totalFiberG totalSugarG totalSodiumMg totalCholesterolMg totalSaturatedFatG totalPotassiumMg
        entries { id foodName mealType calories proteinG carbsG fatG fiberG sugarG sodiumMg cholesterolMg saturatedFatG potassiumMg }
      }
      waterToday {
        id date totalOz goalOz goalMet entries { amountOz loggedAt }
      }
      streak { currentStreak longestStreak totalWorkouts }
      recentPRs { id exerciseName weightLbs reps oneRepMaxLbs achievedAt workoutDate }
    }
  }
`;

const GET_STRENGTH_PROGRESS = gql`
  query GetStrengthProgress($exerciseName: String!, $days: Int) {
    getStrengthProgress(exerciseName: $exerciseName, days: $days) {
      date maxWeightLbs estimatedOneRepMax totalVolume
    }
  }
`;

const GET_MACRO_TRENDS = gql`
  query GetMacroTrends($days: Int, $endDate: String) {
    getMacroTrends(days: $days, endDate: $endDate) { date calories proteinG carbsG fatG }
  }
`;

const GET_WATER_TRENDS = gql`
  query GetWaterTrends($days: Int, $endDate: String) {
    getWaterTrends(days: $days, endDate: $endDate) { date totalOz goalOz goalMet }
  }
`;

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private readonly apollo: Apollo) {}

  getDashboardSummary(date: string): Observable<DashboardSummary> {
    return this.apollo.query<{ getDashboardSummary: DashboardSummary }>({
      query: GET_DASHBOARD_SUMMARY,
      variables: { date },
      fetchPolicy: 'network-only',
    }).pipe(map(r => r.data.getDashboardSummary));
  }

  getStrengthProgress(exerciseName: string, days: number = 90): Observable<StrengthDataPoint[]> {
    return this.apollo.query<{ getStrengthProgress: StrengthDataPoint[] }>({
      query: GET_STRENGTH_PROGRESS,
      variables: { exerciseName, days },
      fetchPolicy: 'network-only',
    }).pipe(map(r => r.data.getStrengthProgress));
  }

  getMacroTrends(days: number = 30, endDate?: string): Observable<MacroTrendPoint[]> {
    return this.apollo.query<{ getMacroTrends: MacroTrendPoint[] }>({
      query: GET_MACRO_TRENDS,
      variables: { days, endDate: endDate ?? null },
      fetchPolicy: 'network-only',
    }).pipe(map(r => r.data.getMacroTrends));
  }

  getWaterTrends(days: number = 30, endDate?: string): Observable<WaterTrendPoint[]> {
    return this.apollo.query<{ getWaterTrends: WaterTrendPoint[] }>({
      query: GET_WATER_TRENDS,
      variables: { days, endDate: endDate ?? null },
      fetchPolicy: 'network-only',
    }).pipe(map(r => r.data.getWaterTrends));
  }
}
