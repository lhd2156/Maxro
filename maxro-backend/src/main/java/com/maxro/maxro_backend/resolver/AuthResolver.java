package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.dto.auth.AuthPayload;
import com.maxro.maxro_backend.dto.auth.LoginInput;
import com.maxro.maxro_backend.dto.auth.RegisterInput;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.AuthService;
import com.maxro.maxro_backend.service.GoogleAuthService;
import jakarta.validation.Valid;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.stereotype.Controller;

@Controller
public class AuthResolver {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;
    private final SecurityContextHelper securityContextHelper;

    public AuthResolver(AuthService authService,
                        GoogleAuthService googleAuthService,
                        SecurityContextHelper securityContextHelper) {
        this.authService = authService;
        this.googleAuthService = googleAuthService;
        this.securityContextHelper = securityContextHelper;
    }

    @MutationMapping
    public AuthPayload register(@Argument @Valid RegisterInput input) {
        return authService.register(input);
    }

    @MutationMapping
    public AuthPayload login(@Argument @Valid LoginInput input) {
        return authService.login(input);
    }

    @MutationMapping
    public AuthPayload googleSignIn(@Argument String idToken) {
        return googleAuthService.signInWithGoogle(idToken);
    }

    @MutationMapping
    public AuthPayload refreshToken(@Argument String token) {
        return authService.refreshToken(token);
    }

    @MutationMapping
    public boolean logout() {
        String userId = securityContextHelper.getCurrentUserId();
        authService.logout(userId);
        return true;
    }
}
