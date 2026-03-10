package com.maxro.maxro_backend.dto.auth;

public record SpotifyTokenResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        String scope,
        String tokenType
) {
}
