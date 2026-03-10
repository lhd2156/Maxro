package com.maxro.maxro_backend.security;

import com.maxro.maxro_backend.exception.AuthenticationException;
import com.maxro.maxro_backend.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityContextHelper {

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new AuthenticationException("Not authenticated");
        }
        return user;
    }

    public String getCurrentUserId() {
        return getCurrentUser().getId();
    }
}
