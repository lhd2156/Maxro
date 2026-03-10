package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.model.User;
import com.maxro.maxro_backend.model.WaterIntake;
import com.maxro.maxro_backend.repository.UserRepository;
import com.maxro.maxro_backend.repository.WaterIntakeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WaterIntakeServiceImplTest {

    @Mock private WaterIntakeRepository waterIntakeRepository;
    @Mock private UserRepository userRepository;
    @InjectMocks private WaterIntakeServiceImpl waterIntakeService;

    @Test
    void logWater_createsNewRecordForFirstLogOfDay() {
        LocalDate date = LocalDate.now();
        User user = new User();
        user.setDailyWaterGoalOz(64.0);

        when(waterIntakeRepository.findByUserIdAndDate("u1", date)).thenReturn(Optional.empty());
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(waterIntakeRepository.save(any(WaterIntake.class))).thenAnswer(inv -> inv.getArgument(0));

        WaterIntake result = waterIntakeService.logWater("u1", date, 16.0);

        assertEquals(16.0, result.getTotalOz());
        assertEquals(64.0, result.getGoalOz());
        assertEquals(1, result.getEntries().size());
    }

    @Test
    void logWater_appendsToExistingRecord() {
        LocalDate date = LocalDate.now();
        WaterIntake existing = buildWaterIntake("u1", date, 32.0, 64.0);
        when(waterIntakeRepository.findByUserIdAndDate("u1", date)).thenReturn(Optional.of(existing));
        when(waterIntakeRepository.save(any(WaterIntake.class))).thenAnswer(inv -> inv.getArgument(0));

        WaterIntake result = waterIntakeService.logWater("u1", date, 16.0);

        assertEquals(48.0, result.getTotalOz());
        assertEquals(2, result.getEntries().size());
    }

    @Test
    void logWater_goalMetWhenTotalExceedsGoal() {
        LocalDate date = LocalDate.now();
        WaterIntake existing = buildWaterIntake("u1", date, 56.0, 64.0);
        when(waterIntakeRepository.findByUserIdAndDate("u1", date)).thenReturn(Optional.of(existing));
        when(waterIntakeRepository.save(any(WaterIntake.class))).thenAnswer(inv -> inv.getArgument(0));

        WaterIntake result = waterIntakeService.logWater("u1", date, 16.0);

        assertTrue(result.isGoalMet(), "72 oz should exceed 64 oz goal");
    }

    @Test
    void getWaterIntake_returnsNullWhenAbsent() {
        when(waterIntakeRepository.findByUserIdAndDate("u1", LocalDate.now()))
                .thenReturn(Optional.empty());

        assertNull(waterIntakeService.getWaterIntake("u1", LocalDate.now()));
    }

    @Test
    void logWater_fallsBackToDefaultGoalWhenUserHasNoSetting() {
        LocalDate date = LocalDate.now();
        User user = new User();
        user.setDailyWaterGoalOz(null);

        when(waterIntakeRepository.findByUserIdAndDate("u1", date)).thenReturn(Optional.empty());
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(waterIntakeRepository.save(any(WaterIntake.class))).thenAnswer(inv -> inv.getArgument(0));

        WaterIntake result = waterIntakeService.logWater("u1", date, 8.0);

        assertEquals(64.0, result.getGoalOz(), "Should fall back to 64 oz when user has no custom goal");
    }

    private WaterIntake buildWaterIntake(String userId, LocalDate date,
                                         double existingOz, double goalOz) {
        WaterIntake wi = new WaterIntake();
        wi.setUserId(userId);
        wi.setDate(date);
        wi.setGoalOz(goalOz);
        wi.setEntries(new ArrayList<>());
        wi.getEntries().add(new com.maxro.maxro_backend.model.WaterEntry(existingOz));
        return wi;
    }
}
