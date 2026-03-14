package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.dto.auth.AuthPayload;
import com.maxro.maxro_backend.dto.auth.LoginInput;
import com.maxro.maxro_backend.dto.auth.RegisterInput;
import com.maxro.maxro_backend.exception.AuthenticationException;
import com.maxro.maxro_backend.exception.DuplicateResourceException;
import com.maxro.maxro_backend.model.RefreshToken;
import com.maxro.maxro_backend.model.User;
import com.maxro.maxro_backend.repository.RefreshTokenRepository;
import com.maxro.maxro_backend.repository.UserRepository;
import com.maxro.maxro_backend.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
                userRepository, refreshTokenRepository, passwordEncoder,
                jwtTokenProvider, 604_800_000L);
    }

    @Test
    void register_createsUserAndReturnsTokens() {
        var input = new RegisterInput(" Test@Example.com ", "password123", "Test", "User", "2000-01-01", "Male", true, null, null, null, null, null);
        when(userRepository.existsByEmailIgnoreCase("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("new-id");
            return u;
        });
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("access-jwt");
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthPayload result = authService.register(input);

        assertEquals("access-jwt", result.accessToken());
        assertNotNull(result.refreshToken());
        assertEquals("test@example.com", result.user().email());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("hashed", userCaptor.getValue().getPassword());
        assertEquals("test@example.com", userCaptor.getValue().getEmail());
    }

    @Test
    void register_normalizesPersonalNameCasing() {
        var input = new RegisterInput(" mixed@example.com ", "password123", " beN ", " dO ", "2000-01-01", "Male", true, null, null, null, null, null);
        when(userRepository.existsByEmailIgnoreCase("mixed@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("mixed-id");
            return u;
        });
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("access-jwt");
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        authService.register(input);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("Ben", userCaptor.getValue().getFirstName());
        assertEquals("Do", userCaptor.getValue().getLastName());
        assertEquals("Ben Do", userCaptor.getValue().getDisplayName());
    }

    @Test
    void register_throwsOnDuplicateEmailIgnoringCaseAndWhitespace() {
        var input = new RegisterInput(" Taken@Example.com ", "pass", "First", "Last", null, null, true, null, null, null, null, null);
        when(userRepository.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> authService.register(input));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_returnsTokensForValidCredentials() {
        var input = new LoginInput(" User@Test.com ", "correct");
        User user = buildUser("id-1", "user@test.com", "encoded-pw");
        when(userRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct", "encoded-pw")).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("jwt");
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthPayload result = authService.login(input);

        assertEquals("jwt", result.accessToken());
        assertEquals("id-1", result.user().id());
    }

    @Test
    void login_throwsOnGoogleOnlyAccount() {
        var input = new LoginInput("user@test.com", "correct");
        User user = buildUser("id-1", "user@test.com", "");
        when(userRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(user));

        assertThrows(AuthenticationException.class, () -> authService.login(input));
    }

    @Test
    void login_throwsOnWrongPassword() {
        var input = new LoginInput("user@test.com", "wrong");
        User user = buildUser("id-1", "user@test.com", "encoded-pw");
        when(userRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "encoded-pw")).thenReturn(false);

        assertThrows(AuthenticationException.class, () -> authService.login(input));
    }

    @Test
    void login_throwsOnUnknownEmail() {
        var input = new LoginInput("nobody@test.com", "pass");
        when(userRepository.findByEmailIgnoreCase("nobody@test.com")).thenReturn(Optional.empty());

        assertThrows(AuthenticationException.class, () -> authService.login(input));
    }

    @Test
    void refreshToken_issuesNewTokensAndDeletesOldOne() {
        RefreshToken existing = new RefreshToken();
        existing.setUserId("u1");
        existing.setToken("old-refresh");
        existing.setExpiresAt(Instant.now().plusSeconds(3600));

        User user = buildUser("u1", "a@b.com", "pw");
        when(refreshTokenRepository.findByToken("old-refresh")).thenReturn(Optional.of(existing));
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("new-jwt");
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthPayload result = authService.refreshToken("old-refresh");

        assertEquals("new-jwt", result.accessToken());
        verify(refreshTokenRepository).delete(existing);
    }

    @Test
    void refreshToken_throwsOnExpired() {
        RefreshToken expired = new RefreshToken();
        expired.setToken("expired");
        expired.setExpiresAt(Instant.now().minusSeconds(60));
        when(refreshTokenRepository.findByToken("expired")).thenReturn(Optional.of(expired));

        assertThrows(AuthenticationException.class, () -> authService.refreshToken("expired"));
    }

    @Test
    void logout_deletesAllRefreshTokensForUser() {
        authService.logout("user-42");
        verify(refreshTokenRepository).deleteByUserId("user-42");
    }

    private User buildUser(String id, String email, String password) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setPassword(password);
        u.setDisplayName("Test");
        u.setCreatedAt(Instant.now());
        return u;
    }
}
