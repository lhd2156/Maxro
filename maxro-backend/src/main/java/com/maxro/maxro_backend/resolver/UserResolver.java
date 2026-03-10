package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.dto.user.ChangePasswordInput;
import com.maxro.maxro_backend.dto.user.UserProfileInput;
import com.maxro.maxro_backend.dto.user.UserProfileResponse;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class UserResolver {

    private final UserService userService;
    private final SecurityContextHelper securityContextHelper;

    public UserResolver(UserService userService, SecurityContextHelper securityContextHelper) {
        this.userService = userService;
        this.securityContextHelper = securityContextHelper;
    }

    @QueryMapping
    public UserProfileResponse me() {
        return userService.getProfile(securityContextHelper.getCurrentUserId());
    }

    @MutationMapping
    public UserProfileResponse updateProfile(@Argument @Valid UserProfileInput input) {
        return userService.updateProfile(securityContextHelper.getCurrentUserId(), input);
    }

    @MutationMapping
    public UserProfileResponse updateDailyWaterGoal(@Argument double goalOz) {
        return userService.updateDailyWaterGoal(securityContextHelper.getCurrentUserId(), goalOz);
    }

    @MutationMapping
    public UserProfileResponse changePassword(@Argument @Valid ChangePasswordInput input) {
        return userService.changePassword(securityContextHelper.getCurrentUserId(), input);
    }

    @MutationMapping
    public boolean deleteAccount() {
        return userService.deleteAccount(securityContextHelper.getCurrentUserId());
    }
}
