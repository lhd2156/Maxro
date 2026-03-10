import { NutritionLog } from './nutrition.model';
import { PersonalRecord, StreakInfo, Workout } from './workout.model';
import { WaterIntake } from './water.model';

export interface StrengthDataPoint {
  date: string;
  maxWeightLbs: number;
  estimatedOneRepMax: number;
  totalVolume: number;
}

export interface DashboardSummary {
  date: string;
  workoutToday: Workout | null;
  nutritionToday: NutritionLog | null;
  waterToday: WaterIntake | null;
  streak: StreakInfo;
  recentPRs: PersonalRecord[];
}
