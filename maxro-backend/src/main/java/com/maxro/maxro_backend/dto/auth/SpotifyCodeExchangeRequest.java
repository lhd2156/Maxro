package com.maxro.maxro_backend.dto.auth;

public record SpotifyCodeExchangeRequest(
        String code,
        String redirectUri
) {
}
