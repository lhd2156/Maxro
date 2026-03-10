package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.dto.auth.SpotifyTokenResponse;
import com.maxro.maxro_backend.service.SpotifyAuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class SpotifyAuthServiceImpl implements SpotifyAuthService {

    private final String spotifyClientId;
    private final String spotifyClientSecret;
    private final WebClient webClient;

    public SpotifyAuthServiceImpl(@Value("${maxro.spotify.client-id:}") String spotifyClientId,
                                  @Value("${maxro.spotify.client-secret:}") String spotifyClientSecret) {
        this.spotifyClientId = spotifyClientId;
        this.spotifyClientSecret = spotifyClientSecret;
        this.webClient = WebClient.builder()
                .baseUrl("https://accounts.spotify.com")
                .build();
    }

    @Override
    public SpotifyTokenResponse exchangeCode(String code, String redirectUri) {
        if (code == null || code.isBlank() || redirectUri == null || redirectUri.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Spotify code exchange requires code and redirect URI");
        }

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "authorization_code");
        formData.add("code", code);
        formData.add("redirect_uri", redirectUri);

        return executeTokenRequest(formData);
    }

    @Override
    public SpotifyTokenResponse refreshAccessToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Spotify refresh token is required");
        }

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "refresh_token");
        formData.add("refresh_token", refreshToken);

        return executeTokenRequest(formData);
    }

    private SpotifyTokenResponse executeTokenRequest(MultiValueMap<String, String> formData) {
        validateConfiguration();

        Map<String, Object> response;
        try {
            response = webClient.post()
                    .uri("/api/token")
                    .headers(headers -> headers.setBasicAuth(spotifyClientId, spotifyClientSecret))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData(formData))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (WebClientResponseException ex) {
            String reason = ex.getResponseBodyAsString();
            if (reason == null || reason.isBlank()) {
                reason = ex.getStatusText();
            }
            throw new ResponseStatusException(BAD_GATEWAY, "Spotify token request failed: " + reason, ex);
        } catch (Exception ex) {
            throw new ResponseStatusException(BAD_GATEWAY, "Spotify token request failed", ex);
        }

        if (response == null || response.get("access_token") == null) {
            throw new ResponseStatusException(BAD_GATEWAY, "Spotify did not return an access token");
        }

        Object expiresIn = response.get("expires_in");
        long expiresInSeconds = expiresIn instanceof Number number ? number.longValue() : 3600L;

        return new SpotifyTokenResponse(
                (String) response.get("access_token"),
                (String) response.getOrDefault("refresh_token", ""),
                expiresInSeconds,
                (String) response.getOrDefault("scope", ""),
                (String) response.getOrDefault("token_type", "Bearer")
        );
    }

    private void validateConfiguration() {
        if (spotifyClientId == null || spotifyClientId.isBlank()
                || spotifyClientSecret == null || spotifyClientSecret.isBlank()) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Spotify integration is not configured");
        }
    }
}

