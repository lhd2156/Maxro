package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.exception.ResourceNotFoundException;
import com.maxro.maxro_backend.model.FoodEntry;
import com.maxro.maxro_backend.model.NutritionLog;
import com.maxro.maxro_backend.repository.NutritionLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NutritionServiceImplTest {

    @Mock private NutritionLogRepository nutritionLogRepository;
    @InjectMocks private NutritionServiceImpl nutritionService;

    @Test
    void logNutrition_createsNewLogWhenNoneExists() {
        LocalDate date = LocalDate.of(2025, 6, 15);
        when(nutritionLogRepository.findByUserIdAndDate("u1", date)).thenReturn(Optional.empty());
        when(nutritionLogRepository.save(any(NutritionLog.class))).thenAnswer(inv -> inv.getArgument(0));

        FoodEntry entry = buildEntry("Chicken", 200, 30, 0, 5);
        NutritionLog result = nutritionService.logNutrition("u1", date, List.of(entry));

        assertEquals("u1", result.getUserId());
        assertEquals(date, result.getDate());
        assertEquals(1, result.getEntries().size());
    }

    @Test
    void logNutrition_appendsToExistingLog() {
        LocalDate date = LocalDate.now();
        NutritionLog existing = buildNutritionLog("u1", date, 1);
        when(nutritionLogRepository.findByUserIdAndDate("u1", date)).thenReturn(Optional.of(existing));
        when(nutritionLogRepository.save(any(NutritionLog.class))).thenAnswer(inv -> inv.getArgument(0));

        FoodEntry newEntry = buildEntry("Rice", 300, 5, 60, 1);
        NutritionLog result = nutritionService.logNutrition("u1", date, List.of(newEntry));

        assertEquals(2, result.getEntries().size(), "New entries should be appended, not replaced");
    }

    @Test
    void addFoodEntry_appendsSingleEntry() {
        LocalDate date = LocalDate.now();
        NutritionLog existing = buildNutritionLog("u1", date, 0);
        when(nutritionLogRepository.findByUserIdAndDate("u1", date)).thenReturn(Optional.of(existing));
        when(nutritionLogRepository.save(any(NutritionLog.class))).thenAnswer(inv -> inv.getArgument(0));

        FoodEntry entry = buildEntry("Egg", 70, 6, 0, 5);
        NutritionLog result = nutritionService.addFoodEntry("u1", date, entry);

        assertEquals(1, result.getEntries().size());
    }

    @Test
    void removeFoodEntry_removesMatchingEntry() {
        LocalDate date = LocalDate.now();
        FoodEntry entry = buildEntry("Oats", 150, 5, 27, 3);
        String entryId = entry.getId();

        NutritionLog log = buildNutritionLog("u1", date, 0);
        log.getEntries().add(entry);
        when(nutritionLogRepository.findByUserIdAndDate("u1", date)).thenReturn(Optional.of(log));
        when(nutritionLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        NutritionLog result = nutritionService.removeFoodEntry("u1", date, entryId);

        assertTrue(result.getEntries().isEmpty());
    }

    @Test
    void removeFoodEntry_throwsWhenEntryNotFound() {
        LocalDate date = LocalDate.now();
        NutritionLog log = buildNutritionLog("u1", date, 1);
        when(nutritionLogRepository.findByUserIdAndDate("u1", date)).thenReturn(Optional.of(log));

        assertThrows(ResourceNotFoundException.class,
                () -> nutritionService.removeFoodEntry("u1", date, "nonexistent-id"));
    }

    @Test
    void getNutritionLog_returnsNullWhenAbsent() {
        when(nutritionLogRepository.findByUserIdAndDate("u1", LocalDate.now()))
                .thenReturn(Optional.empty());

        assertNull(nutritionService.getNutritionLog("u1", LocalDate.now()));
    }

    private FoodEntry buildEntry(String name, double cal, double protein, double carbs, double fat) {
        FoodEntry e = new FoodEntry();
        e.setFoodName(name);
        e.setMealType("Lunch");
        e.setServingQty(1);
        e.setServingUnit("serving");
        e.setCalories(cal);
        e.setProteinG(protein);
        e.setCarbsG(carbs);
        e.setFatG(fat);
        return e;
    }

    private NutritionLog buildNutritionLog(String userId, LocalDate date, int entryCount) {
        NutritionLog log = new NutritionLog();
        log.setUserId(userId);
        log.setDate(date);
        log.setEntries(new ArrayList<>());
        for (int i = 0; i < entryCount; i++) {
            log.getEntries().add(buildEntry("Food " + i, 100, 10, 10, 5));
        }
        return log;
    }
}
