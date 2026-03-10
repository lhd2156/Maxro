package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.model.Workout;
import org.springframework.data.domain.Page;

import java.time.LocalDate;
import java.util.List;

public interface WorkoutService {
    Workout logWorkout(String userId, Workout workout);
    Workout getWorkout(String userId, String workoutId);
    Page<Workout> getWorkouts(String userId, LocalDate startDate, LocalDate endDate, int page, int size);
    Page<Workout> getWorkoutsByExercise(String userId, String exerciseName, int page, int size);
    void deleteWorkout(String userId, String workoutId);
    List<String> getExerciseNames(String userId);
    List<String> getMuscleGroups(String userId);
    List<String> getPopularExercises(String muscleGroup);
}
