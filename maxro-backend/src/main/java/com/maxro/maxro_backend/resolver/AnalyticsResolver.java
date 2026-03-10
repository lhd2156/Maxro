package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.dto.analytics.*;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.AnalyticsService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.time.LocalDate;
import java.util.List;

@Controller
public class AnalyticsResolver {

    private final AnalyticsService analyticsService;
    private final SecurityContextHelper securityContextHelper;

    public AnalyticsResolver(AnalyticsService analyticsService,
                             SecurityContextHelper securityContextHelper) {
        this.analyticsService = analyticsService;
        this.securityContextHelper = securityContextHelper;
    }

    @QueryMapping
    public StreakInfoDto getWorkoutStreak() {
        return analyticsService.getWorkoutStreak(securityContextHelper.getCurrentUserId());
    }

    @QueryMapping
    public List<StrengthDataPointDto> getStrengthProgress(@Argument String exerciseName,
                                                           @Argument Integer days) {
        int d = days != null ? days : 90;
        return analyticsService.getStrengthProgress(
                securityContextHelper.getCurrentUserId(), exerciseName, d);
    }

    @QueryMapping
    public List<MacroTrendPointDto> getMacroTrends(@Argument Integer days, @Argument String endDate) {
        int d = days != null ? days : 30;
        LocalDate end = (endDate != null && !endDate.isBlank())
                ? LocalDate.parse(endDate) : LocalDate.now();
        return analyticsService.getMacroTrends(securityContextHelper.getCurrentUserId(), d, end);
    }

    @QueryMapping
    public List<WaterTrendPointDto> getWaterTrends(@Argument Integer days, @Argument String endDate) {
        int d = days != null ? days : 30;
        LocalDate end = (endDate != null && !endDate.isBlank())
                ? LocalDate.parse(endDate) : LocalDate.now();
        return analyticsService.getWaterTrends(securityContextHelper.getCurrentUserId(), d, end);
    }

    @QueryMapping
    public DashboardSummaryDto getDashboardSummary(@Argument String date) {
        return analyticsService.getDashboardSummary(
                securityContextHelper.getCurrentUserId(), LocalDate.parse(date));
    }
}
