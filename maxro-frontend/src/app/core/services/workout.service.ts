import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, tap, Subject, BehaviorSubject } from 'rxjs';
import { PersonalRecord, StreakInfo, Workout, WorkoutInput, WorkoutPage, WorkoutResult } from '../models/workout.model';

const WORKOUT_FIELDS = `
  id userId date notes createdAt
  exercises {
    name muscleGroup
    sets { reps weightLbs }
  }
`;

const LOG_WORKOUT = gql`
  mutation LogWorkout($input: WorkoutInput!) {
    logWorkout(input: $input) {
      workout { ${WORKOUT_FIELDS} }
      newPersonalRecords { id exerciseName weightLbs reps oneRepMaxLbs achievedAt }
    }
  }
`;

const GET_WORKOUTS = gql`
  query GetWorkouts($startDate: String, $endDate: String, $page: Int, $size: Int) {
    getWorkouts(startDate: $startDate, endDate: $endDate, page: $page, size: $size) {
      content { ${WORKOUT_FIELDS} }
      totalElements totalPages currentPage
    }
  }
`;

const GET_WORKOUT = gql`
  query GetWorkout($id: ID!) {
    getWorkout(id: $id) { ${WORKOUT_FIELDS} }
  }
`;

const DELETE_WORKOUT = gql`
  mutation DeleteWorkout($id: ID!) {
    deleteWorkout(id: $id)
  }
`;

const GET_PERSONAL_RECORDS = gql`
  query GetPersonalRecords {
    getPersonalRecords { id exerciseName weightLbs reps oneRepMaxLbs achievedAt }
  }
`;

const GET_WORKOUT_STREAK = gql`
  query GetWorkoutStreak {
    getWorkoutStreak { currentStreak longestStreak totalWorkouts }
  }
`;

const GET_EXERCISE_NAMES = gql`
  query GetExerciseNames { getExerciseNames }
`;

const GET_POPULAR_EXERCISES = gql`
  query GetPopularExercises($muscleGroup: String) {
    getPopularExercises(muscleGroup: $muscleGroup)
  }
`;

@Injectable({ providedIn: 'root' })
export class WorkoutService {
  /** Shared store so Workout History and Dashboard stay in sync. Refreshed on save. */
  private readonly workoutsStore$ = new BehaviorSubject<WorkoutPage | null>(null);
  readonly workouts$ = this.workoutsStore$.asObservable();

  /** Emits when a workout is saved. Subscribe to refresh workout lists. */
  readonly workoutSaved$ = new Subject<void>();

  constructor(private readonly apollo: Apollo) {}

  logWorkout(input: WorkoutInput): Observable<WorkoutResult> {
    return this.apollo.mutate<{ logWorkout: WorkoutResult }>({
      mutation: LOG_WORKOUT,
      variables: { input },
    }).pipe(
      map(r => r.data!.logWorkout),
      tap(() => {
        this.workoutSaved$.next();
        this.refreshWorkoutsStore();
      }),
    );
  }

  /** Refreshes the workouts store (called after save so Workout History shows new data). */
  refreshWorkoutsStore(): void {
    this.loadWorkoutsToStore(0, 20);
  }

  /** Fetches workouts and updates the store. Workout History subscribes to workouts$. */
  loadWorkoutsToStore(page: number = 0, size: number = 20): void {
    const emptyPage: WorkoutPage = { content: [], totalElements: 0, totalPages: 0, currentPage: 0 };
    this.apollo.query<{ getWorkouts: WorkoutPage }>({
      query: GET_WORKOUTS,
      variables: { page, size },
      fetchPolicy: 'network-only',
    }).subscribe({
      next: r => this.workoutsStore$.next(r.data.getWorkouts),
      error: () => this.workoutsStore$.next(emptyPage),
    });
  }

  getWorkouts(page: number = 0, size: number = 20, startDate?: string, endDate?: string): Observable<WorkoutPage> {
    return this.apollo.query<{ getWorkouts: WorkoutPage }>({
      query: GET_WORKOUTS,
      variables: { startDate, endDate, page, size },
      fetchPolicy: 'network-only',
    }).pipe(map(r => r.data.getWorkouts));
  }

  getWorkout(id: string): Observable<Workout> {
    return this.apollo.query<{ getWorkout: Workout }>({
      query: GET_WORKOUT,
      variables: { id },
    }).pipe(map(r => r.data.getWorkout));
  }

  deleteWorkout(id: string): Observable<boolean> {
    return this.apollo.mutate<{ deleteWorkout: boolean }>({
      mutation: DELETE_WORKOUT,
      variables: { id },
      refetchQueries: [{ query: GET_PERSONAL_RECORDS }],
      awaitRefetchQueries: true,
    }).pipe(
      map(r => r.data!.deleteWorkout),
      tap(() => {
        this.workoutSaved$.next();
        this.refreshWorkoutsStore();
      }),
    );
  }

  getPersonalRecords(): Observable<PersonalRecord[]> {
    return this.apollo.query<{ getPersonalRecords: PersonalRecord[] }>({
      query: GET_PERSONAL_RECORDS,
      fetchPolicy: 'network-only',
    }).pipe(map(r => r.data.getPersonalRecords));
  }

  getWorkoutStreak(): Observable<StreakInfo> {
    return this.apollo.query<{ getWorkoutStreak: StreakInfo }>({
      query: GET_WORKOUT_STREAK,
    }).pipe(map(r => r.data.getWorkoutStreak));
  }

  getExerciseNames(): Observable<string[]> {
    return this.apollo.query<{ getExerciseNames: string[] }>({
      query: GET_EXERCISE_NAMES,
    }).pipe(map(r => r.data.getExerciseNames));
  }

  getPopularExercises(muscleGroup?: string | null): Observable<string[]> {
    return this.apollo.query<{ getPopularExercises: string[] }>({
      query: GET_POPULAR_EXERCISES,
      variables: { muscleGroup: muscleGroup ?? null },
    }).pipe(map(r => r.data.getPopularExercises));
  }
}
