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

                return buildWorkoutStreak(userId, LocalDate.now());
        }

        private StreakInfoDto buildWorkoutStreak(String userId, LocalDate referenceDate) {
                log.debug("Calculating workout streak for user: {} with reference date: {}", userId, referenceDate);

        List<Workout> workouts = workoutRepository.findAllDatesByUserId(userId);

        if (workouts.isEmpty()) {
            return new StreakInfoDto(0, 0, 0);
        }

                LocalDate anchorDate = referenceDate != null ? referenceDate : LocalDate.now();

        Set<LocalDate> workoutDates = workouts.stream()
                .map(Workout::getDate)
                                .filter(Objects::nonNull)
                                .filter(date -> !date.isAfter(anchorDate))
                .collect(Collectors.toCollection(TreeSet::new));

                long totalWorkouts = workoutDates.size();

                if (workoutDates.isEmpty()) {
                        return new StreakInfoDto(0, 0, 0);
                }

                int currentStreak = calculateCurrentStreak(workoutDates, anchorDate);
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
                Workout workoutToday = null;
                NutritionLog nutritionToday = null;
                WaterIntake waterToday = null;
                StreakInfoDto streak = new StreakInfoDto(0, 0, 0);
                List<PersonalRecord> recentPRs = List.of();

                try {
                        var workoutsToday = workoutRepository.findAllByUserIdAndDateFlexible(userId, dateStr, date);
                        workoutToday = mergeWorkoutsForDay(userId, date, workoutsToday);
                } catch (Exception ex) {
                        log.warn("Failed loading workoutToday for user {} on {}", userId, dateStr, ex);
                }

                try {
                        nutritionToday = nutritionLogRepository.findByUserIdAndDateFlexible(userId, dateStr, date).orElse(null);
                } catch (Exception ex) {
                        log.warn("Failed loading nutritionToday for user {} on {}", userId, dateStr, ex);
                }

                try {
                        waterToday = waterIntakeRepository.findByUserIdAndDateFlexible(userId, dateStr, date).orElse(null);
                } catch (Exception ex) {
                        log.warn("Failed loading waterToday for user {} on {}", userId, dateStr, ex);
                }

                try {
                        streak = buildWorkoutStreak(userId, date);
                } catch (Exception ex) {
                        log.warn("Failed loading streak for user {}", userId, ex);
                }

                try {
                        var recent = personalRecordService.getRecentPRs(userId, 7);
                        var workoutIds = recent.stream()
                                        .map(PersonalRecord::getWorkoutId)
                                        .filter(Objects::nonNull)
                                        .map(String::trim)
                                        .filter(id -> !id.isEmpty())
                                        .collect(Collectors.toSet());

                        var workoutDateById = workoutRepository.findAllById(workoutIds).stream()
                                        .filter(w -> w.getId() != null && w.getDate() != null)
                                        .collect(Collectors.toMap(Workout::getId, Workout::getDate, (a, b) -> a));

                        recentPRs = recent.stream()
                                        .filter(pr -> isVisibleOnDashboardDate(pr, date, workoutDateById))
                                        .toList();
                } catch (Exception ex) {
                        log.warn("Failed loading recent PRs for user {} on {}", userId, dateStr, ex);
                }

        return new DashboardSummaryDto(
                dateStr, workoutToday, nutritionToday,
                waterToday, streak, recentPRs
        );
    }

        private Workout mergeWorkoutsForDay(String userId, LocalDate date, List<Workout> workouts) {
                if (workouts == null || workouts.isEmpty()) {
                        return null;
                }

                var sorted = workouts.stream()
                                .sorted(Comparator.comparing(Workout::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                                .toList();

                var merged = new Workout();
                var latest = sorted.get(sorted.size() - 1);
                merged.setId(latest.getId());
                merged.setUserId(userId);
                merged.setDate(date);
                merged.setCreatedAt(latest.getCreatedAt());

                var combinedExercises = sorted.stream()
                                .flatMap(w -> w.getExercises().stream())
                                .toList();
                merged.setExercises(new ArrayList<>(combinedExercises));

                var notes = sorted.stream()
                                .map(Workout::getNotes)
                                .filter(Objects::nonNull)
                                .map(String::trim)
                                .filter(s -> !s.isEmpty())
                                .collect(Collectors.joining(" | "));
                merged.setNotes(notes.isEmpty() ? null : notes);

                return merged;
        }

        private boolean isVisibleOnDashboardDate(PersonalRecord pr, LocalDate selectedDate, Map<String, LocalDate> workoutDateById) {
                String workoutId = pr.getWorkoutId();
                if (workoutId != null && !workoutId.isBlank()) {
                        LocalDate workoutDate = workoutDateById.get(workoutId);
                        if (workoutDate != null) {
                                return !workoutDate.isAfter(selectedDate);
                        }
                }

                if (pr.getAchievedAt() == null) {
                        return false;
                }

                LocalDate achievedDate = pr.getAchievedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                return !achievedDate.isAfter(selectedDate);
        }

        private int calculateCurrentStreak(Set<LocalDate> dates, LocalDate referenceDate) {
                LocalDate today = referenceDate != null ? referenceDate : LocalDate.now();
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
