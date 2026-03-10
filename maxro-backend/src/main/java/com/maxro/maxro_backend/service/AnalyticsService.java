package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.dto.analytics.DashboardSummaryDto;
import com.maxro.maxro_backend.dto.analytics.MacroTrendPointDto;
import com.maxro.maxro_backend.dto.analytics.StreakInfoDto;
import com.maxro.maxro_backend.dto.analytics.StrengthDataPointDto;
import com.maxro.maxro_backend.dto.analytics.WaterTrendPointDto;

import java.time.LocalDate;
import java.util.List;

public interface AnalyticsService {

    StreakInfoDto getWorkoutStreak(String userId);

    List<StrengthDataPointDto> getStrengthProgress(String userId, String exerciseName, int days);

    List<MacroTrendPointDto> getMacroTrends(String userId, int days, LocalDate endDate);

    List<WaterTrendPointDto> getWaterTrends(String userId, int days, LocalDate endDate);

    DashboardSummaryDto getDashboardSummary(String userId, LocalDate date);
}
