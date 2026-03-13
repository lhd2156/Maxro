package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.dto.analytics.*;
import com.maxro.maxro_backend.model.*;
import com.maxro.maxro_backend.repository.NutritionLogRepository;
import com.maxro.maxro_backend.repository.WaterIntakeRepository;
import com.maxro.maxro_backend.repository.WorkoutRepository;
import com.maxro.maxro_backend.service.AnalyticsService;
import com.maxro.maxro_backend.service.PersonalRecordService;
import com.maxro.maxro_backend.util.FitnessCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsServiceImpl implements AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsServiceImpl.class);

    private final WorkoutRepository workoutRepository;
    private final NutritionLogRepository nutritionLogRepository;
    private final WaterIntakeRepository waterIntakeRepository;
    private final PersonalRecordService personalRecordService;

    public AnalyticsServiceImpl(WorkoutRepository workoutRepository,
                                NutritionLogRepository nutritionLogRepository,
                                WaterIntakeRepository waterIntakeRepository,
                                PersonalRecordService personalRecordService) {
        this.workoutRepository = workoutRepository;
        this.nutritionLogRepository = nutritionLogRepository;
        this.waterIntakeRepository = waterIntakeRepository;
        this.personalRecordService = personalRecordService;
    }

    @Override
    public StreakInfoDto getWorkoutStreak(String userId) {
        log.debug("Calculating workout streak for user: {}", userId);

        List<Workout> workouts = workoutRepository.findAllDatesByUserId(userId);
        long totalWorkouts = workouts.size();

        if (workouts.isEmpty()) {
            return new StreakInfoDto(0, 0, 0);
        }

        Set<LocalDate> workoutDates = workouts.stream()
                .map(Workout::getDate)
                .collect(Collectors.toCollection(TreeSet::new));

        int currentStreak = calculateCurrentStreak(workoutDates);
        int longestStreak = calculateLongestStreak(workoutDates);

        return new StreakInfoDto(currentStreak, longestStreak, totalWorkouts);
    }

    @Override
    public List<StrengthDataPointDto> getStrengthProgress(String userId, String exerciseName, int days) {
        log.debug("Calculating strength progress for user: {} on exercise: {}", userId, exerciseName);

        // minusDays(days) to align with frontend (e.g. 7 days from 3/9 is 3/2 to 3/9)
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days);
        List<Workout> workouts = workoutRepository.findByUserIdAndDateBetweenOrderByDateAsc(
                userId, startDate.toString(), endDate.toString(), startDate, endDate);

        return workouts.stream()
                .map(w -> extractStrengthData(w, exerciseName))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();
    }

    @Override
    public List<MacroTrendPointDto> getMacroTrends(String userId, int days, LocalDate endDate) {
        log.debug("Calculating macro trends for user: {} over {} days", userId, days);

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        // minusDays(days) to align with frontend (e.g. 7 days from 3/9 is 3/2 to 3/9)
        LocalDate startDate = end.minusDays(days);

        List<NutritionLog> logs = nutritionLogRepository
                .findByUserIdAndDateBetweenFlexible(userId, startDate.toString(), end.toString(), startDate, end);

        Map<LocalDate, MacroTrendPointDto> byDate = logs.stream()
                .collect(Collectors.toMap(NutritionLog::getDate, logEntry -> new MacroTrendPointDto(
                        logEntry.getDate().toString(),
                        logEntry.getTotalCalories(),
                        logEntry.getTotalProteinG(),
                        logEntry.getTotalCarbsG(),
                        logEntry.getTotalFatG()
                ), (a, b) -> a));

        return startDate.datesUntil(end.plusDays(1))
                .map(d -> byDate.getOrDefault(d, new MacroTrendPointDto(d.toString(), 0, 0, 0, 0)))
                .toList();
    }

    @Override
    public List<WaterTrendPointDto> getWaterTrends(String userId, int days, LocalDate endDate) {
        log.debug("Calculating water trends for user: {} over {} days", userId, days);

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        // minusDays(days) to align with frontend (e.g. 7 days from 3/9 is 3/2 to 3/9)
        LocalDate startDate = end.minusDays(days);

        List<WaterIntake> logs = waterIntakeRepository
                .findByUserIdAndDateBetweenFlexible(userId, startDate.toString(), end.toString(), startDate, end);

        double defaultGoal = 64.0;
        Map<LocalDate, WaterTrendPointDto> byDate = logs.stream()
                .collect(Collectors.toMap(WaterIntake::getDate, entry -> new WaterTrendPointDto(
                        entry.getDate().toString(),
                        entry.getTotalOz(),
                        entry.getGoalOz(),
                        entry.isGoalMet()
                ), (a, b) -> a));

        return startDate.datesUntil(end.plusDays(1))
                .map(d -> byDate.getOrDefault(d, new WaterTrendPointDto(d.toString(), 0, defaultGoal, false)))
                .toList();
    }

    @Override
    public DashboardSummaryDto getDashboardSummary(String userId, LocalDate date) {
        log.debug("Building dashboard summary for user: {} on date: {}", userId, date);

        String dateStr = date.toString();
        Workout workoutToday = workoutRepository.findByUserIdAndDateFlexible(userId, dateStr, date).orElse(null);
        NutritionLog nutritionToday = nutritionLogRepository.findByUserIdAndDateFlexible(userId, dateStr, date).orElse(null);
        WaterIntake waterToday = waterIntakeRepository.findByUserIdAndDateFlexible(userId, dateStr, date).orElse(null);
        StreakInfoDto streak = getWorkoutStreak(userId);
        List<PersonalRecord> recentPRs = personalRecordService.getRecentPRs(userId, 7);

        return new DashboardSummaryDto(
                dateStr, workoutToday, nutritionToday,
                waterToday, streak, recentPRs
        );
    }

    private int calculateCurrentStreak(Set<LocalDate> dates) {
        LocalDate today = LocalDate.now();
        int streak = 0;
        // Start from today if there's a workout, otherwise yesterday.
        // This avoids breaking the streak when the user hasn't worked out yet today.
        LocalDate checkDate = dates.contains(today) ? today : today.minusDays(1);

        while (dates.contains(checkDate)) {
            streak++;
            checkDate = checkDate.minusDays(1);
        }
        return streak;
    }

    private int calculateLongestStreak(Set<LocalDate> dates) {
        if (dates.isEmpty()) return 0;

        List<LocalDate> sortedDates = new ArrayList<>(dates);
        Collections.sort(sortedDates);

        int longest = 1;
        int current = 1;

        for (int i = 1; i < sortedDates.size(); i++) {
            if (sortedDates.get(i).minusDays(1).equals(sortedDates.get(i - 1))) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 1;
            }
        }
        return longest;
    }

    private Optional<StrengthDataPointDto> extractStrengthData(Workout workout, String exerciseName) {
        return workout.getExercises().stream()
                .filter(e -> e.getName().equalsIgnoreCase(exerciseName))
                .findFirst()
                .map(exercise -> {
                    double maxWeight = exercise.getSets().stream()
                            .mapToDouble(ExerciseSet::getWeightLbs).max().orElse(0);
                    double best1RM = exercise.getSets().stream()
                            .mapToDouble(s -> FitnessCalculator.scorePerformance(s.getWeightLbs(), s.getReps()))
                            .max().orElse(0);
                    double totalVolume = exercise.getSets().stream()
                            .mapToDouble(s -> FitnessCalculator.calculateVolume(s.getWeightLbs(), s.getReps()))
                            .sum();
                    return new StrengthDataPointDto(
                            workout.getDate().toString(), maxWeight, best1RM, totalVolume
                    );
                });
    }
}
