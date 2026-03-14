package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.exception.ResourceNotFoundException;
import com.maxro.maxro_backend.model.Exercise;
import com.maxro.maxro_backend.model.Workout;
import com.maxro.maxro_backend.repository.WorkoutRepository;
import com.maxro.maxro_backend.service.PersonalRecordService;
import com.maxro.maxro_backend.service.WorkoutService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WorkoutServiceImpl implements WorkoutService {

    private static final Logger log = LoggerFactory.getLogger(WorkoutServiceImpl.class);

    private final WorkoutRepository workoutRepository;
    private final PersonalRecordService personalRecordService;

    public WorkoutServiceImpl(WorkoutRepository workoutRepository,
                              PersonalRecordService personalRecordService) {
        this.workoutRepository = workoutRepository;
        this.personalRecordService = personalRecordService;
    }

    @Override
    public Workout logWorkout(String userId, Workout workout) {
        log.info("Logging workout for user: {} on date: {}", userId, workout.getDate());
        workout.setUserId(userId);
        Workout saved = workoutRepository.save(workout);
        log.info("Workout logged with id: {}", saved.getId());
        return saved;
    }

    @Override
    public Workout getWorkout(String userId, String workoutId) {
        log.debug("Fetching workout: {} for user: {}", workoutId, userId);
        Workout workout = workoutRepository.findById(workoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout", "id", workoutId));

        if (!workout.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Workout", "id", workoutId);
        }
        return workout;
    }

    @Override
    public Page<Workout> getWorkouts(String userId, LocalDate startDate, LocalDate endDate,
                                     int page, int size) {
        log.debug("Fetching workouts for user: {}, page: {}, size: {}", userId, page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "date"));

        if (startDate != null && endDate != null) {
            return workoutRepository.findByUserIdAndDateBetweenFlexible(
                    userId, startDate.toString(), endDate.toString(), startDate, endDate, pageable);
        }
        return workoutRepository.findByUserIdOrderByDateDesc(userId, pageable);
    }

    @Override
    public Page<Workout> getWorkoutsByExercise(String userId, String exerciseName,
                                               int page, int size) {
        log.debug("Fetching workouts by exercise: {} for user: {}", exerciseName, userId);
        Pageable pageable = PageRequest.of(page, size);
        return workoutRepository.findByUserIdAndExerciseName(userId, exerciseName, pageable);
    }

    @Override
    public void deleteWorkout(String userId, String workoutId) {
        log.info("Deleting workout: {} for user: {}", workoutId, userId);
        Workout workout = getWorkout(userId, workoutId);
        workoutRepository.delete(workout);
        personalRecordService.deletePRsForWorkout(workoutId);
    }

    @Override
    public List<String> getExerciseNames(String userId) {
        log.debug("Fetching exercise names for user: {}", userId);
        return workoutRepository.findAllByUserIdWithExercises(userId).stream()
                .flatMap(w -> w.getExercises().stream())
                .map(Exercise::getName)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getMuscleGroups(String userId) {
        log.debug("Fetching muscle groups for user: {}", userId);
        return workoutRepository.findAllByUserIdWithExercises(userId).stream()
                .flatMap(w -> w.getExercises().stream())
                .map(Exercise::getMuscleGroup)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getPopularExercises(String muscleGroup) {
        if (muscleGroup == null) return List.of();
        return switch (muscleGroup.toLowerCase()) {
            case "chest" -> List.of("Bench Press", "Incline Dumbbell Press", "Chest Fly", "Push-ups", "Cable Crossover");
            case "back" -> List.of("Pull-ups", "Lat Pulldown", "Barbell Row", "Deadlift", "Seated Cable Row");
            case "legs" -> List.of("Squat", "Leg Press", "Leg Extension", "Romanian Deadlift", "Calf Raise", "Hamstring Curl");
            case "shoulders" -> List.of("Overhead Press", "Lateral Raise", "Front Raise", "Face Pull", "Upright Row");
            case "biceps" -> List.of("Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Preacher Curl", "Cable Curl");
            case "triceps" -> List.of("Tricep Pushdown", "Skull Crusher", "Overhead Tricep Extension", "Close-Grip Bench Press", "Dips");
            case "glutes" -> List.of("Hip Thrust", "Glute Bridge", "Bulgarian Split Squat", "Cable Kickback", "Sumo Deadlift");
            case "forearms" -> List.of("Wrist Curl", "Reverse Wrist Curl", "Farmer's Carry", "Plate Pinch Hold", "Behind-the-Back Wrist Curl");
            case "calves" -> List.of("Standing Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Single-Leg Calf Raise", "Calf Press on Leg Press");
            case "full body", "full-body", "fullbody" -> List.of("Burpee", "Thruster", "Kettlebell Swing", "Man Maker", "Clean and Press");
            case "arms" -> List.of("Bicep Curl", "Tricep Extension", "Hammer Curl", "Tricep Pushdown", "Skull Crusher");
            case "core" -> List.of("Crunches", "Plank", "Leg Raises", "Ab Wheel", "Russian Twist");
            default -> List.of();
        };
    }
}