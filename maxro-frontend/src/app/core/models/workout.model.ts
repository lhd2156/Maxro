export interface Workout {
  id: string;
  userId: string;
  date: string;
  notes: string | null;
  exercises: Exercise[];
  createdAt: string;
}

export interface Exercise {
  name: string;
  muscleGroup: string;
  sets: ExerciseSet[];
}

export interface ExerciseSet {
  reps: number;
  weightLbs: number;
}

export interface WorkoutInput {
  date: string;
  notes?: string;
  exercises: ExerciseInput[];
}

export interface ExerciseInput {
  name: string;
  muscleGroup: string;
  sets: SetInput[];
}

export interface SetInput {
  reps: number;
  weightLbs: number;
}

export interface WorkoutPage {
  content: Workout[];
  totalElements: number;
  totalPages: number;
  currentPage?: number;
  number?: number; // Spring Data Page uses getNumber()
}

export interface WorkoutResult {
  workout: Workout;
  newPersonalRecords: PersonalRecord[];
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseName: string;
  weightLbs: number;
  reps: number;
  oneRepMaxLbs: number;
  achievedAt: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
}

export const MUSCLE_GROUPS: string[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Legs', 'Glutes', 'Core', 'Forearms', 'Calves', 'Full Body'
];
