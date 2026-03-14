package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.dto.analytics.DashboardSummaryDto;
import com.maxro.maxro_backend.dto.analytics.MacroTrendPointDto;
import com.maxro.maxro_backend.dto.analytics.StrengthDataPointDto;
import com.maxro.maxro_backend.dto.analytics.StreakInfoDto;
import com.maxro.maxro_backend.model.Exercise;
import com.maxro.maxro_backend.model.ExerciseSet;
import com.maxro.maxro_backend.model.FoodEntry;
import com.maxro.maxro_backend.model.NutritionLog;
import com.maxro.maxro_backend.model.Workout;
import com.maxro.maxro_backend.repository.NutritionLogRepository;
import com.maxro.maxro_backend.repository.WaterIntakeRepository;
import com.maxro.maxro_backend.repository.WorkoutRepository;
import com.maxro.maxro_backend.service.PersonalRecordService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceImplTest {

    @Mock private WorkoutRepository workoutRepository;
    @Mock private NutritionLogRepository nutritionLogRepository;
    @Mock private WaterIntakeRepository waterIntakeRepository;
    @Mock private PersonalRecordService personalRecordService;
    @InjectMocks private AnalyticsServiceImpl analyticsService;

    @Test
    void getWorkoutStreak_returnsZerosWhenNoWorkouts() {
        when(workoutRepository.findAllDatesByUserId("u1")).thenReturn(List.of());

        StreakInfoDto result = analyticsService.getWorkoutStreak("u1");

        assertEquals(0, result.currentStreak());
        assertEquals(0, result.longestStreak());
        assertEquals(0, result.totalWorkouts());
    }

    @Test
    void getWorkoutStreak_countsConsecutiveDays() {
        LocalDate today = LocalDate.now();
        List<Workout> workouts = List.of(
                workoutOnDate(today),
                workoutOnDate(today.minusDays(1)),
                workoutOnDate(today.minusDays(2))
        );
        when(workoutRepository.findAllDatesByUserId("u1")).thenReturn(workouts);

        StreakInfoDto result = analyticsService.getWorkoutStreak("u1");

        assertEquals(3, result.currentStreak());
        assertEquals(3, result.longestStreak());
    }

    @Test
    void getWorkoutStreak_breaksOnGap() {
        LocalDate today = LocalDate.now();
        List<Workout> workouts = List.of(
                workoutOnDate(today),
                workoutOnDate(today.minusDays(1)),
                workoutOnDate(today.minusDays(3)),
                workoutOnDate(today.minusDays(4)),
                workoutOnDate(today.minusDays(5))
        );
        when(workoutRepository.findAllDatesByUserId("u1")).thenReturn(workouts);

        StreakInfoDto result = analyticsService.getWorkoutStreak("u1");

        assertEquals(2, result.currentStreak());
        assertEquals(3, result.longestStreak());
    }

    @Test
    void getStrengthProgress_extractsMaxWeightAndEstimated1RM() {
        LocalDate date = LocalDate.now();
        Exercise ex = new Exercise();
        ex.setName("Bench Press");
        ex.setMuscleGroup("Chest");
        ex.setSets(List.of(new ExerciseSet(5, 225), new ExerciseSet(3, 245)));
        Workout workout = workoutOnDate(date);
        workout.setExercises(List.of(ex));

        when(workoutRepository.findByUserIdAndDateBetweenOrderByDateAsc(
                eq("u1"), any(String.class), any(String.class), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(workout));

        List<StrengthDataPointDto> result = analyticsService.getStrengthProgress("u1", "Bench Press", 30);

        assertEquals(1, result.size());
        assertEquals(245, result.get(0).maxWeightLbs());
        assertTrue(result.get(0).estimatedOneRepMax() > 245, "Estimated 1RM should exceed raw weight");
    }

    @Test
    void getMacroTrends_mapsNutritionLogsToDtos() {
        NutritionLog log = new NutritionLog();
        log.setDate(LocalDate.now());
        log.setEntries(new ArrayList<>());
        FoodEntry entry = new FoodEntry();
        entry.setCalories(500);
        entry.setProteinG(40);
        entry.setCarbsG(50);
        entry.setFatG(20);
        log.getEntries().add(entry);

        when(nutritionLogRepository.findByUserIdAndDateBetweenFlexible(
                eq("u1"), any(String.class), any(String.class), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(log));

        List<MacroTrendPointDto> result = analyticsService.getMacroTrends("u1", 7, null);

        assertEquals(8, result.size());
        assertEquals(0, result.get(0).calories());
        assertEquals(500, result.get(result.size() - 1).calories());
        assertEquals(40, result.get(result.size() - 1).proteinG());
    }

    @Test
    void getDashboardSummary_assemblesAllDataSources() {
        LocalDate date = LocalDate.now();
        String dateStr = date.toString();
        when(workoutRepository.findAllByUserIdAndDateFlexible(eq("u1"), eq(dateStr), eq(date))).thenReturn(List.of());
        when(nutritionLogRepository.findByUserIdAndDateFlexible(eq("u1"), eq(dateStr), eq(date))).thenReturn(Optional.empty());
        when(waterIntakeRepository.findByUserIdAndDateFlexible(eq("u1"), eq(dateStr), eq(date))).thenReturn(Optional.empty());
        when(workoutRepository.findAllDatesByUserId("u1")).thenReturn(List.of());
        when(personalRecordService.getRecentPRs("u1", 7)).thenReturn(List.of());

        DashboardSummaryDto result = analyticsService.getDashboardSummary("u1", date);

        assertNotNull(result);
        assertEquals(dateStr, result.date());
        assertNull(result.workoutToday());
        assertEquals(0, result.streak().currentStreak());
    }

    private Workout workoutOnDate(LocalDate date) {
        Workout workout = new Workout();
        workout.setDate(date);
        workout.setExercises(List.of());
        return workout;
    }
}


