package com.maxro.maxro_backend.dto.user;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UserProfileInput(
        @Size(min = 1, max = 50)
        String firstName,

        @Size(min = 1, max = 50)
        String lastName,

        @Size(min = 2, max = 50, message = "Display name must be between 2 and 50 characters")
        String displayName,

        @Min(value = 50, message = "Body weight must be at least 50 lbs")
        @Max(value = 1000, message = "Body weight must be at most 1000 lbs")
        Double bodyWeightLbs,

        @Min(value = 36, message = "Height must be at least 36 inches")
        @Max(value = 108, message = "Height must be at most 108 inches")
        Double heightInches,

        String fitnessGoal,

        @Min(value = 500, message = "Daily calorie target must be at least 500")
        @Max(value = 10000, message = "Daily calorie target must be at most 10000")
        Integer dailyCalorieTarget,

        @Min(value = 10, message = "Daily protein target must be at least 10g")
        @Max(value = 500, message = "Daily protein target must be at most 500g")
        Integer dailyProteinTarget,

        @Min(value = 10, message = "Daily carb target must be at least 10g")
        @Max(value = 1000, message = "Daily carb target must be at most 1000g")
        Integer dailyCarbTarget,

        @Min(value = 10, message = "Daily fat target must be at least 10g")
        @Max(value = 500, message = "Daily fat target must be at most 500g")
        Integer dailyFatTarget,

        @Min(value = 8, message = "Daily water goal must be at least 8 oz")
        @Max(value = 300, message = "Daily water goal must be at most 300 oz")
        Double dailyWaterGoalOz,

        String dateOfBirth,
        String gender,
        Boolean agreedToTerms
) {}
