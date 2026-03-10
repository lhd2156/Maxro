package com.maxro.maxro_backend.dto.analytics;

import com.maxro.maxro_backend.model.NutritionLog;
import com.maxro.maxro_backend.model.PersonalRecord;
import com.maxro.maxro_backend.model.WaterIntake;
import com.maxro.maxro_backend.model.Workout;

import java.util.List;

public record DashboardSummaryDto(
        String date,
        Workout workoutToday,
        NutritionLog nutritionToday,
        WaterIntake waterToday,
        StreakInfoDto streak,
        List<PersonalRecord> recentPRs
) {}
