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
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WaterIntakeServiceImplTest {

    @Mock private WaterIntakeRepository waterIntakeRepository;
    @Mock private UserRepository userRepository;
    @Mock private MongoTemplate mongoTemplate;
    @InjectMocks private WaterIntakeServiceImpl waterIntakeService;

    @Test
    void logWater_createsNewRecordForFirstLogOfDay() {
        LocalDate date = LocalDate.now();
        User user = new User();
        user.setDailyWaterGoalOz(64.0);
        WaterIntake saved = buildWaterIntake("u1", date, 16.0, 64.0);

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(WaterIntake.class)))
                .thenReturn(saved);

        WaterIntake result = waterIntakeService.logWater("u1", date, 16.0);

        assertEquals(16.0, result.getTotalOz());
        assertEquals(64.0, result.getGoalOz());
        assertEquals(1, result.getEntries().size());
        verify(mongoTemplate).findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(WaterIntake.class));
        verifyNoInteractions(waterIntakeRepository);
    }

    @Test
    void logWater_appendsToExistingRecord() {
        LocalDate date = LocalDate.now();
        User user = new User();
        user.setDailyWaterGoalOz(64.0);
        WaterIntake saved = buildWaterIntake("u1", date, 48.0, 64.0);
        saved.getEntries().add(new com.maxro.maxro_backend.model.WaterEntry(16.0));

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(WaterIntake.class)))
                .thenReturn(saved);

        WaterIntake result = waterIntakeService.logWater("u1", date, 16.0);

        assertEquals(64.0, result.getGoalOz());
        assertEquals(2, result.getEntries().size());
    }

    @Test
    void logWater_goalMetWhenTotalExceedsGoal() {
        LocalDate date = LocalDate.now();
        User user = new User();
        user.setDailyWaterGoalOz(64.0);
        WaterIntake saved = buildWaterIntake("u1", date, 56.0, 64.0);
        saved.getEntries().add(new com.maxro.maxro_backend.model.WaterEntry(16.0));

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(WaterIntake.class)))
                .thenReturn(saved);

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
        WaterIntake saved = buildWaterIntake("u1", date, 8.0, 64.0);

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(WaterIntake.class)))
                .thenReturn(saved);

        WaterIntake result = waterIntakeService.logWater("u1", date, 8.0);

        assertEquals(64.0, result.getGoalOz(), "Should fall back to 64 oz when user has no custom goal");
    }

    private WaterIntake buildWaterIntake(String userId, LocalDate date,
                                         double existingOz, double goalOz) {
        WaterIntake waterIntake = new WaterIntake();
        waterIntake.setUserId(userId);
        waterIntake.setDate(date);
        waterIntake.setGoalOz(goalOz);
        waterIntake.setEntries(new ArrayList<>());
        waterIntake.getEntries().add(new com.maxro.maxro_backend.model.WaterEntry(existingOz));
        return waterIntake;
    }
}
