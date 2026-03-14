package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.dto.user.ChangePasswordInput;
import com.maxro.maxro_backend.dto.user.UserProfileInput;
import com.maxro.maxro_backend.dto.user.UserProfileResponse;
import com.maxro.maxro_backend.exception.AuthenticationException;
import com.maxro.maxro_backend.exception.ResourceNotFoundException;
import com.maxro.maxro_backend.model.User;
import com.maxro.maxro_backend.repository.*;
import com.maxro.maxro_backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class UserServiceImpl implements UserService {

    private static final Logger log = LoggerFactory.getLogger(UserServiceImpl.class);

    private final UserRepository userRepository;
    private final WorkoutRepository workoutRepository;
    private final PersonalRecordRepository personalRecordRepository;
    private final NutritionLogRepository nutritionLogRepository;
    private final WaterIntakeRepository waterIntakeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(
            UserRepository userRepository,
            WorkoutRepository workoutRepository,
            PersonalRecordRepository personalRecordRepository,
            NutritionLogRepository nutritionLogRepository,
            WaterIntakeRepository waterIntakeRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.workoutRepository = workoutRepository;
        this.personalRecordRepository = personalRecordRepository;
        this.nutritionLogRepository = nutritionLogRepository;
        this.waterIntakeRepository = waterIntakeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserProfileResponse getProfile(String userId) {
        log.debug("Fetching profile for user: {}", userId);
        User user = findUserById(userId);
        return UserProfileResponse.fromUser(user);
    }

    @Override
    public UserProfileResponse updateProfile(String userId, UserProfileInput input) {
        log.info("Updating profile for user: {}", userId);
        User user = findUserById(userId);

        boolean hasNameUpdates = input.firstName() != null || input.lastName() != null;
        if (input.firstName() != null) user.setFirstName(normalizePersonalName(input.firstName()));
        if (input.lastName() != null) user.setLastName(normalizePersonalName(input.lastName()));
        if (hasNameUpdates) {
            String first = user.getFirstName() != null ? user.getFirstName() : "";
            String last = user.getLastName() != null ? user.getLastName() : "";
            user.setDisplayName((first + " " + last).trim());
        }
        if (input.displayName() != null && !hasNameUpdates) user.setDisplayName(input.displayName());
        if (input.bodyWeightLbs() != null) user.setBodyWeightLbs(input.bodyWeightLbs());
        if (input.heightInches() != null) user.setHeightInches(input.heightInches());
        if (input.fitnessGoal() != null) user.setFitnessGoal(input.fitnessGoal());
        if (input.dailyCalorieTarget() != null) user.setDailyCalorieTarget(input.dailyCalorieTarget());
        if (input.dailyProteinTarget() != null) user.setDailyProteinTarget(input.dailyProteinTarget());
        if (input.dailyCarbTarget() != null) user.setDailyCarbTarget(input.dailyCarbTarget());
        if (input.dailyFatTarget() != null) user.setDailyFatTarget(input.dailyFatTarget());
        if (input.dailyWaterGoalOz() != null) user.setDailyWaterGoalOz(input.dailyWaterGoalOz());
        if (input.dateOfBirth() != null) user.setDateOfBirth(input.dateOfBirth());
        if (input.gender() != null) user.setGender(input.gender());
        if (input.agreedToTerms() != null) {
            user.setAgreedToTerms(input.agreedToTerms());
            if (input.agreedToTerms()) user.setProfileComplete(true);
        }

        user = userRepository.save(user);
        log.info("Profile updated for user: {}", userId);
        return UserProfileResponse.fromUser(user);
    }

    @Override
    public UserProfileResponse updateDailyWaterGoal(String userId, double goalOz) {
        log.info("Updating daily water goal for user: {} to {} oz", userId, goalOz);
        User user = findUserById(userId);
        user.setDailyWaterGoalOz(goalOz);
        user = userRepository.save(user);
        return UserProfileResponse.fromUser(user);
    }

    @Override
    public UserProfileResponse changePassword(String userId, ChangePasswordInput input) {
        log.info("Changing password for user: {}", userId);
        User user = findUserById(userId);
        boolean hasPassword = user.getPassword() != null && !user.getPassword().isBlank();

        if (hasPassword) {
            if (input.currentPassword() == null || input.currentPassword().isBlank()) {
                throw new AuthenticationException("Current password is required");
            }
            if (!passwordEncoder.matches(input.currentPassword(), user.getPassword())) {
                throw new AuthenticationException("Current password is incorrect");
            }
        }

        user.setPassword(passwordEncoder.encode(input.newPassword().trim()));
        user = userRepository.save(user);
        return UserProfileResponse.fromUser(user);
    }

    @Override
    public boolean deleteAccount(String userId) {
        log.warn("Deleting account and all data for user: {}", userId);
        findUserById(userId);

        workoutRepository.deleteByUserId(userId);
        personalRecordRepository.deleteByUserId(userId);
        nutritionLogRepository.deleteByUserId(userId);
        waterIntakeRepository.deleteByUserId(userId);
        refreshTokenRepository.deleteByUserId(userId);
        userRepository.deleteById(userId);

        log.info("Account deleted for user: {}", userId);
        return true;
    }

    private User findUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    private String normalizePersonalName(String raw) {
        if (raw == null) {
            return "";
        }

        String compact = raw.trim().replaceAll("\\s+", " ");
        if (compact.isEmpty()) {
            return compact;
        }

        String lower = compact.toLowerCase(Locale.ROOT);
        StringBuilder result = new StringBuilder(lower.length());
        boolean uppercaseNextLetter = true;

        for (int i = 0; i < lower.length(); i++) {
            char ch = lower.charAt(i);
            if (Character.isLetter(ch)) {
                result.append(uppercaseNextLetter ? Character.toUpperCase(ch) : ch);
                uppercaseNextLetter = false;
            } else {
                result.append(ch);
                if (ch == ' ' || ch == '-' || ch == '\'') {
                    uppercaseNextLetter = true;
                }
            }
        }

        return result.toString();
    }
}
