package com.maxro.maxro_backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterInput(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,

        @NotBlank(message = "First name is required")
        @Size(min = 1, max = 50, message = "First name must be between 1 and 50 characters")
        String firstName,

        @NotBlank(message = "Last name is required")
        @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters")
        String lastName,

        String dateOfBirth,
        String gender,
        Boolean agreedToTerms,
        Integer dailyCalorieTarget,
        Integer dailyProteinTarget,
        Integer dailyCarbTarget,
        Integer dailyFatTarget,
        Double dailyWaterGoalOz
) {}
