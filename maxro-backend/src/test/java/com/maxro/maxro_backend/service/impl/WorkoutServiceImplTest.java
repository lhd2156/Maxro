package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.exception.ResourceNotFoundException;
import com.maxro.maxro_backend.model.Exercise;
import com.maxro.maxro_backend.model.ExerciseSet;
import com.maxro.maxro_backend.model.Workout;
import com.maxro.maxro_backend.repository.WorkoutRepository;
import com.maxro.maxro_backend.service.PersonalRecordService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutServiceImplTest {

    @Mock private WorkoutRepository workoutRepository;
    @Mock private PersonalRecordService personalRecordService;
    @InjectMocks private WorkoutServiceImpl workoutService;

    @Test
    void logWorkout_setsUserIdAndDelegatesToRepo() {
        Workout w = new Workout();
        w.setDate(LocalDate.now());
        when(workoutRepository.save(any(Workout.class))).thenAnswer(inv -> {
            Workout saved = inv.getArgument(0);
            saved.setId("wk-1");
            return saved;
        });

        Workout result = workoutService.logWorkout("user-1", w);

        assertEquals("user-1", result.getUserId());
        assertEquals("wk-1", result.getId());
    }

    @Test
    void getWorkout_returnsWhenOwnerMatches() {
        Workout w = new Workout();
        w.setId("wk-1");
        w.setUserId("user-1");
        when(workoutRepository.findById("wk-1")).thenReturn(Optional.of(w));

        Workout result = workoutService.getWorkout("user-1", "wk-1");

        assertEquals("wk-1", result.getId());
    }

    @Test
    void getWorkout_throwsWhenOwnerMismatch() {
        Workout w = new Workout();
        w.setId("wk-1");
        w.setUserId("other-user");
        when(workoutRepository.findById("wk-1")).thenReturn(Optional.of(w));

        assertThrows(ResourceNotFoundException.class,
                () -> workoutService.getWorkout("user-1", "wk-1"));
    }

    @Test
    void getWorkouts_withoutDateRange_queriesAllByUser() {
        Page<Workout> page = new PageImpl<>(List.of(new Workout()));
        when(workoutRepository.findByUserIdOrderByDateDesc(eq("u1"), any(Pageable.class)))
                .thenReturn(page);

        Page<Workout> result = workoutService.getWorkouts("u1", null, null, 0, 20);

        assertEquals(1, result.getContent().size());
        verify(workoutRepository, never()).findByUserIdAndDateBetweenFlexible(
                any(), any(), any(), any(), any(), any());
    }

    @Test
    void getWorkouts_withDateRange_queriesFlexibleRange() {
        LocalDate start = LocalDate.of(2025, 1, 1);
        LocalDate end = LocalDate.of(2025, 1, 31);
        Page<Workout> page = new PageImpl<>(List.of());
        when(workoutRepository.findByUserIdAndDateBetweenFlexible(
                eq("u1"), eq("2025-01-01"), eq("2025-01-31"), eq(start), eq(end), any(Pageable.class)))
                .thenReturn(page);

        workoutService.getWorkouts("u1", start, end, 0, 20);

        verify(workoutRepository).findByUserIdAndDateBetweenFlexible(
                eq("u1"), eq("2025-01-01"), eq("2025-01-31"), eq(start), eq(end), any(Pageable.class));
    }

    @Test
    void deleteWorkout_removesOwnedWorkout() {
        Workout w = new Workout();
        w.setId("wk-1");
        w.setUserId("u1");
        when(workoutRepository.findById("wk-1")).thenReturn(Optional.of(w));

        workoutService.deleteWorkout("u1", "wk-1");

        verify(workoutRepository).delete(w);
    }

    @Test
    void getExerciseNames_returnsDistinctSortedNames() {
        Workout w1 = buildWorkoutWithExercise("Bench Press", "Chest");
        Workout w2 = buildWorkoutWithExercise("Squat", "Legs");
        Workout w3 = buildWorkoutWithExercise("Bench Press", "Chest");
        when(workoutRepository.findAllByUserIdWithExercises("u1"))
                .thenReturn(List.of(w1, w2, w3));

        List<String> names = workoutService.getExerciseNames("u1");

        assertEquals(List.of("Bench Press", "Squat"), names);
    }

    private Workout buildWorkoutWithExercise(String name, String muscleGroup) {
        Exercise ex = new Exercise();
        ex.setName(name);
        ex.setMuscleGroup(muscleGroup);
        ex.setSets(List.of(new ExerciseSet(8, 135)));
        Workout w = new Workout();
        w.setUserId("u1");
        w.setExercises(List.of(ex));
        return w;
    }
}