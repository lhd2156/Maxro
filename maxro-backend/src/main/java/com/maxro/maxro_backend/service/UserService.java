package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.dto.user.UserProfileInput;
import com.maxro.maxro_backend.dto.user.UserProfileResponse;

public interface UserService {

    UserProfileResponse getProfile(String userId);

    UserProfileResponse updateProfile(String userId, UserProfileInput input);

    UserProfileResponse updateDailyWaterGoal(String userId, double goalOz);

    boolean deleteAccount(String userId);
}
