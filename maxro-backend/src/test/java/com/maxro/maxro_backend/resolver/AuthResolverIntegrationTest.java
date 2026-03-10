package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.dto.auth.AuthPayload;
import com.maxro.maxro_backend.dto.auth.LoginInput;
import com.maxro.maxro_backend.dto.auth.RegisterInput;
import com.maxro.maxro_backend.dto.user.UserProfileResponse;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.GraphQlTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.graphql.test.tester.GraphQlTester;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Integration test that boots the GraphQL layer in isolation and verifies
 * that schema definitions, argument binding, and resolver wiring all work
 * together as expected without needing a live database.
 */
@GraphQlTest(AuthResolver.class)
class AuthResolverIntegrationTest {

    @Autowired
    private GraphQlTester graphQlTester;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private SecurityContextHelper securityContextHelper;

    @Test
    void register_returnsAccessTokenAndUserProfile() {
        var userProfile = new UserProfileResponse(
                "user-1", "new@example.com", "New User", "New", "User",
                null, null, null,
                2000, 150, 250, 65, 64.0,
                null, null, true, true,
                "2025-01-01T00:00:00Z");
        var payload = new AuthPayload("access-token-123", "refresh-token-456", userProfile);

        when(authService.register(any(RegisterInput.class))).thenReturn(payload);

        graphQlTester.document("""
                mutation {
                    register(input: {
                        email: "new@example.com"
                        password: "securepass"
                        firstName: "New"
                        lastName: "User"
                    }) {
                        accessToken
                        refreshToken
                        user {
                            id
                            email
                            displayName
                            firstName
                            lastName
                            dailyCalorieTarget
                        }
                    }
                }
                """)
                .execute()
                .path("register.accessToken").entity(String.class).isEqualTo("access-token-123")
                .path("register.user.email").entity(String.class).isEqualTo("new@example.com")
                .path("register.user.displayName").entity(String.class).isEqualTo("New User")
                .path("register.user.dailyCalorieTarget").entity(Integer.class).isEqualTo(2000);
    }

    @Test
    void login_returnsAuthPayload() {
        var userProfile = new UserProfileResponse(
                "user-2", "test@test.com", "Tester", "Test", "User",
                180.0, 72.0, "Build Muscle",
                2500, 180, 300, 70, 80.0,
                "1995-06-15", "Male", true, true,
                "2025-01-01T00:00:00Z");
        var payload = new AuthPayload("jwt-xyz", "refresh-abc", userProfile);

        when(authService.login(any(LoginInput.class))).thenReturn(payload);

        graphQlTester.document("""
                mutation {
                    login(input: {
                        email: "test@test.com"
                        password: "password123"
                    }) {
                        accessToken
                        refreshToken
                        user {
                            id
                            email
                            displayName
                            bodyWeightLbs
                            fitnessGoal
                        }
                    }
                }
                """)
                .execute()
                .path("login.accessToken").entity(String.class).isEqualTo("jwt-xyz")
                .path("login.user.id").entity(String.class).isEqualTo("user-2")
                .path("login.user.bodyWeightLbs").entity(Double.class).isEqualTo(180.0)
                .path("login.user.fitnessGoal").entity(String.class).isEqualTo("Build Muscle");
    }

    @Test
    void refreshToken_returnsNewTokens() {
        var userProfile = new UserProfileResponse(
                "user-1", "a@b.com", "User", "U", "User",
                null, null, null,
                2000, 150, 250, 65, 64.0,
                null, null, true, true, null);
        var payload = new AuthPayload("new-access", "new-refresh", userProfile);

        when(authService.refreshToken("old-refresh-token")).thenReturn(payload);

        graphQlTester.document("""
                mutation {
                    refreshToken(token: "old-refresh-token") {
                        accessToken
                        refreshToken
                    }
                }
                """)
                .execute()
                .path("refreshToken.accessToken").entity(String.class).isEqualTo("new-access")
                .path("refreshToken.refreshToken").entity(String.class).isEqualTo("new-refresh");
    }
}
