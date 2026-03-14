package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.dto.auth.AuthPayload;
import com.maxro.maxro_backend.dto.auth.LoginInput;
import com.maxro.maxro_backend.dto.auth.RegisterInput;
import com.maxro.maxro_backend.dto.user.UserProfileResponse;
import com.maxro.maxro_backend.exception.AuthenticationException;
import com.maxro.maxro_backend.exception.DuplicateResourceException;
import com.maxro.maxro_backend.model.RefreshToken;
import com.maxro.maxro_backend.model.User;
import com.maxro.maxro_backend.repository.RefreshTokenRepository;
import com.maxro.maxro_backend.repository.UserRepository;
import com.maxro.maxro_backend.security.JwtTokenProvider;
import com.maxro.maxro_backend.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);
    private static final int MIN_REGISTER_AGE = 13;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final long refreshTokenExpirationMs;

    public AuthServiceImpl(UserRepository userRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           PasswordEncoder passwordEncoder,
                           JwtTokenProvider jwtTokenProvider,
                           @Value("${maxro.jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    @Override
    public AuthPayload register(RegisterInput input) {
        String normalizedEmail = normalizeEmail(input.email());
        String firstName = normalizePersonalName(input.firstName());
        String lastName = normalizePersonalName(input.lastName());
        String dateOfBirth = validateAndNormalizeDateOfBirth(input.dateOfBirth());

        log.info("Registering new user with email: {}", normalizedEmail);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateResourceException("User", "email", normalizedEmail);
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(input.password()));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setDisplayName(firstName + " " + lastName);
        user.setDateOfBirth(dateOfBirth);
        user.setGender(input.gender());
        user.setAgreedToTerms(input.agreedToTerms() != null && input.agreedToTerms());
        if (input.dailyCalorieTarget() != null) user.setDailyCalorieTarget(input.dailyCalorieTarget());
        if (input.dailyProteinTarget() != null) user.setDailyProteinTarget(input.dailyProteinTarget());
        if (input.dailyCarbTarget() != null) user.setDailyCarbTarget(input.dailyCarbTarget());
        if (input.dailyFatTarget() != null) user.setDailyFatTarget(input.dailyFatTarget());
        if (input.dailyWaterGoalOz() != null) user.setDailyWaterGoalOz(input.dailyWaterGoalOz());
        user.setProfileComplete(true);
        user.setCreatedAt(Instant.now());
        user = userRepository.save(user);

        log.info("User registered successfully: {}", user.getId());
        return buildAuthPayload(user);
    }

    @Override
    public AuthPayload login(LoginInput input) {
        String normalizedEmail = normalizeEmail(input.email());
        log.info("Login attempt for email: {}", normalizedEmail);

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new AuthenticationException("Invalid email or password"));

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new AuthenticationException("This account uses Google sign-in. Use Continue with Google or set a password in Settings.");
        }

        if (!passwordEncoder.matches(input.password(), user.getPassword())) {
            throw new AuthenticationException("Invalid email or password");
        }

        log.info("User logged in successfully: {}", user.getId());
        return buildAuthPayload(user);
    }

    @Override
    public AuthPayload refreshToken(String token) {
        log.debug("Refreshing token");

        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new AuthenticationException("Invalid refresh token"));

        if (refreshToken.isExpired()) {
            refreshTokenRepository.delete(refreshToken);
            throw new AuthenticationException("Refresh token has expired");
        }

        User user = userRepository.findById(refreshToken.getUserId())
                .orElseThrow(() -> new AuthenticationException("User not found"));

        // Delete then reissue prevents token reuse because each refresh token is single-use.
        refreshTokenRepository.delete(refreshToken);
        log.debug("Token refreshed for user: {}", user.getId());
        return buildAuthPayload(user);
    }

    @Override
    public void logout(String userId) {
        log.info("Logging out user: {}", userId);
        refreshTokenRepository.deleteByUserId(userId);
    }

    private AuthPayload buildAuthPayload(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshTokenValue = createRefreshToken(user.getId());
        UserProfileResponse profile = UserProfileResponse.fromUser(user);
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

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
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

    private String validateAndNormalizeDateOfBirth(String dobRaw) {
        if (dobRaw == null || dobRaw.isBlank()) {
            throw new IllegalArgumentException("dateOfBirth: Date of birth is required");
        }

        LocalDate dob;
        try {
            dob = LocalDate.parse(dobRaw);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("dateOfBirth: Enter a valid date (YYYY-MM-DD)");
        }

        LocalDate today = LocalDate.now();
        if (dob.isAfter(today)) {
            throw new IllegalArgumentException("dateOfBirth: Date of birth cannot be in the future");
        }

        LocalDate latestAllowedDob = today.minusYears(MIN_REGISTER_AGE);
        if (dob.isAfter(latestAllowedDob)) {
            throw new IllegalArgumentException("dateOfBirth: You must be at least " + MIN_REGISTER_AGE + " years old");
        }

        return dob.toString();
    }
}
