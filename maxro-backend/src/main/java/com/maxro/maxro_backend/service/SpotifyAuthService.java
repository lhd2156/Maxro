package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.dto.auth.SpotifyTokenResponse;

public interface SpotifyAuthService {

    SpotifyTokenResponse exchangeCode(String code, String redirectUri);

    SpotifyTokenResponse refreshAccessToken(String refreshToken);
}
