package com.maxro.maxro_backend.dto.auth;

import com.maxro.maxro_backend.dto.user.UserProfileResponse;

public record AuthPayload(
        String accessToken,
        String refreshToken,
        UserProfileResponse user
) {}
