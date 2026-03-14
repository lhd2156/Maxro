package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.dto.user.UserProfileInput;
import com.maxro.maxro_backend.dto.user.UserProfileResponse;
import com.maxro.maxro_backend.exception.ResourceNotFoundException;
import com.maxro.maxro_backend.model.User;
import com.maxro.maxro_backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock private UserRepository userRepository;
    @InjectMocks private UserServiceImpl userService;

    @Test
    void getProfile_returnsProfileDto() {
        User user = buildUser("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        UserProfileResponse result = userService.getProfile("u1");

        assertEquals("u1", result.id());
        assertEquals("Test User", result.displayName());
    }

    @Test
    void getProfile_throwsWhenNotFound() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getProfile("missing"));
    }

    @Test
    void updateProfile_appliesOnlyNonNullFields() {
        User user = buildUser("u1");
        user.setDailyCalorieTarget(2000);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // Only updating first/last name - calorie target should remain unchanged
        var input = new UserProfileInput("New", "Name", null, null, null, null,
                null, null, null, null, null, null, null, null);

        UserProfileResponse result = userService.updateProfile("u1", input);

        assertEquals("New Name", result.displayName());
        assertEquals(2000, result.dailyCalorieTarget());
    }

    @Test
    void updateProfile_normalizesNameCaseFromSettingsPayload() {
        User user = buildUser("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        var input = new UserProfileInput(" ge ", " dO ", null, null, null, null,
                null, null, null, null, null, null, null, null);

        UserProfileResponse result = userService.updateProfile("u1", input);

        assertEquals("Ge", result.firstName());
        assertEquals("Do", result.lastName());
        assertEquals("Ge Do", result.displayName());
    }

    @Test
    void updateProfile_prefersNameDerivedDisplayNameWhenNamesProvided() {
        User user = buildUser("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        var input = new UserProfileInput("beN", "dO", "raw display", null, null, null,
                null, null, null, null, null, null, null, null);

        UserProfileResponse result = userService.updateProfile("u1", input);

        assertEquals("Ben", result.firstName());
        assertEquals("Do", result.lastName());
        assertEquals("Ben Do", result.displayName());
    }

    @Test
    void updateDailyWaterGoal_updatesAndSaves() {
        User user = buildUser("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserProfileResponse result = userService.updateDailyWaterGoal("u1", 128.0);

        assertEquals(128.0, result.dailyWaterGoalOz());
        verify(userRepository).save(any(User.class));
    }

    private User buildUser(String id) {
        User u = new User();
        u.setId(id);
        u.setEmail("test@test.com");
        u.setDisplayName("Test User");
        u.setCreatedAt(Instant.now());
        return u;
    }
}
