package com.maxro.maxro_backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;

    // 256-bit minimum key required by HS256
    private static final String SECRET = "test-secret-key-that-is-at-least-256-bits-long-for-hmac-sha";
    private static final long EXPIRATION_MS = 900_000L;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(SECRET, EXPIRATION_MS);
    }

    @Test
    void generateAccessToken_returnsNonBlankJwt() {
        String token = tokenProvider.generateAccessToken("user-123", "test@example.com");

        assertNotNull(token);
        assertFalse(token.isBlank());
        assertEquals(3, token.split("\\.").length, "JWT must have three dot-separated segments");
    }

    @Test
    void getUserIdFromToken_roundTrips() {
        String userId = "user-abc-789";
        String token = tokenProvider.generateAccessToken(userId, "user@test.com");

        assertEquals(userId, tokenProvider.getUserIdFromToken(token));
    }

    @Test
    void validateToken_acceptsValidToken() {
        String token = tokenProvider.generateAccessToken("u1", "a@b.com");

        assertTrue(tokenProvider.validateToken(token));
    }

    @Test
    void validateToken_rejectsGarbage() {
        assertFalse(tokenProvider.validateToken("not.a.jwt"));
    }

    @Test
    void validateToken_rejectsNull() {
        assertFalse(tokenProvider.validateToken(null));
    }

    @Test
    void validateToken_rejectsExpiredToken() {
        // Provider with 0 ms expiration - token is already expired on creation
        JwtTokenProvider expiredProvider = new JwtTokenProvider(SECRET, 0L);
        String token = expiredProvider.generateAccessToken("u1", "a@b.com");

        assertFalse(expiredProvider.validateToken(token));
    }

    @Test
    void validateToken_rejectsTamperedToken() {
        String token = tokenProvider.generateAccessToken("u1", "a@b.com");
        String tampered = token.substring(0, token.length() - 4) + "XXXX";

        assertFalse(tokenProvider.validateToken(tampered));
    }
}
