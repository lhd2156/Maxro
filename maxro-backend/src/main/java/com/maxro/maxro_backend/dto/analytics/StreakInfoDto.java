package com.maxro.maxro_backend.dto.analytics;

public record StreakInfoDto(
        int currentStreak,
        int longestStreak,
        long totalWorkouts
) {}
