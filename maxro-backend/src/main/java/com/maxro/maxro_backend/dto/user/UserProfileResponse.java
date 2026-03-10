package com.maxro.maxro_backend.dto.user;

import com.maxro.maxro_backend.model.User;

public record UserProfileResponse(
        String id,
        String email,
        String displayName,
        String firstName,
        String lastName,
        Double bodyWeightLbs,
        Double heightInches,
        String fitnessGoal,
        Integer dailyCalorieTarget,
        Integer dailyProteinTarget,
        Integer dailyCarbTarget,
        Integer dailyFatTarget,
        Double dailyWaterGoalOz,
        String dateOfBirth,
        String gender,
        Boolean agreedToTerms,
        Boolean hasPassword,
        Boolean profileComplete,
        String createdAt
) {
    public static UserProfileResponse fromUser(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getFirstName(),
                user.getLastName(),
                user.getBodyWeightLbs(),
                user.getHeightInches(),
                user.getFitnessGoal(),
                user.getDailyCalorieTarget(),
                user.getDailyProteinTarget(),
                user.getDailyCarbTarget(),
                user.getDailyFatTarget(),
                user.getDailyWaterGoalOz(),
                user.getDateOfBirth(),
                user.getGender(),
                user.getAgreedToTerms() != null ? user.getAgreedToTerms() : true,
                user.getPassword() != null && !user.getPassword().isBlank(),
                user.getProfileComplete() != null ? user.getProfileComplete() : true,
                user.getCreatedAt() != null ? user.getCreatedAt().toString() : null
        );
    }
}
