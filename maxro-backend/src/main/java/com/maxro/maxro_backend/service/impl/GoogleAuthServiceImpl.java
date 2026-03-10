package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.dto.auth.AuthPayload;
import com.maxro.maxro_backend.dto.user.UserProfileResponse;
import com.maxro.maxro_backend.exception.AuthenticationException;
import com.maxro.maxro_backend.model.RefreshToken;
import com.maxro.maxro_backend.model.User;
import com.maxro.maxro_backend.repository.RefreshTokenRepository;
import com.maxro.maxro_backend.repository.UserRepository;
import com.maxro.maxro_backend.security.JwtTokenProvider;
import com.maxro.maxro_backend.service.GoogleAuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Verifies Google ID tokens via Google's tokeninfo endpoint and
 * either finds an existing user or creates a new one. Returns
 * the same AuthPayload (JWT) as regular email/password auth.
 */
@Service
public class GoogleAuthServiceImpl implements GoogleAuthService {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthServiceImpl.class);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final long refreshTokenExpirationMs;
    private final String googleClientId;
    private final WebClient webClient;

    public GoogleAuthServiceImpl(UserRepository userRepository,
                                  RefreshTokenRepository refreshTokenRepository,
                                  JwtTokenProvider jwtTokenProvider,
                                  @Value("${maxro.jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs,
                                  @Value("${maxro.google.client-id:}") String googleClientId) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        this.googleClientId = googleClientId;
        this.webClient = WebClient.builder().baseUrl("https://oauth2.googleapis.com").build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public AuthPayload signInWithGoogle(String idToken) {
        log.info("Processing Google sign-in");

        Map<String, Object> tokenInfo;
        try {
            tokenInfo = webClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/tokeninfo").queryParam("id_token", idToken).build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("Failed to verify Google ID token", e);
            throw new AuthenticationException("Invalid Google token");
        }

        if (tokenInfo == null || tokenInfo.containsKey("error")) {
            throw new AuthenticationException("Invalid Google token");
        }

        if (!googleClientId.isEmpty()) {
            String aud = (String) tokenInfo.get("aud");
            if (!googleClientId.equals(aud)) {
                throw new AuthenticationException("Google token audience mismatch");
            }
        }

        String email = (String) tokenInfo.get("email");
        String name = (String) tokenInfo.get("name");
        if (email == null || email.isBlank()) {
            throw new AuthenticationException("Google account has no email");
        }

        User user = userRepository.findByEmail(email.toLowerCase().trim())
                .orElseGet(() -> {
                    log.info("Creating new user from Google sign-in: {}", email);
                    User newUser = new User();
                    newUser.setEmail(email.toLowerCase().trim());
                    newUser.setPassword("");
                    newUser.setDisplayName(name != null ? name : email.split("@")[0]);
                    newUser.setAgreedToTerms(false);
                    newUser.setProfileComplete(false);
                    newUser.setCreatedAt(Instant.now());
                    return userRepository.save(newUser);
                });

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshTokenValue = createRefreshToken(user.getId());
        UserProfileResponse profile = UserProfileResponse.fromUser(user);

        log.info("Google sign-in successful for user: {}", user.getId());
        return new AuthPayload(accessToken, refreshTokenValue, profile);
    }

    private String createRefreshToken(String userId) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(userId);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiresAt(Instant.now().plusMillis(refreshTokenExpirationMs));
        refreshTokenRepository.save(refreshToken);
        return refreshToken.getToken();
    }
}
