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
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NutritionServiceImplTest {

    @Mock private NutritionLogRepository nutritionLogRepository;
    @Mock private MongoTemplate mongoTemplate;
    @InjectMocks private NutritionServiceImpl nutritionService;

    @Test
    void logNutrition_createsOrUpdatesLogAtomically() {
        LocalDate date = LocalDate.of(2025, 6, 15);
        FoodEntry entry = buildEntry("Chicken", 200, 30, 0, 5);
        NutritionLog savedLog = buildNutritionLog("u1", date, 0);
        savedLog.getEntries().add(entry);

        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(NutritionLog.class)))
                .thenReturn(savedLog);

        NutritionLog result = nutritionService.logNutrition("u1", date, List.of(entry));

        assertEquals("u1", result.getUserId());
        assertEquals(date, result.getDate());
        assertEquals(1, result.getEntries().size());
        verify(mongoTemplate).findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(NutritionLog.class));
        verifyNoInteractions(nutritionLogRepository);
    }

    @Test
    void addFoodEntry_appendsSingleEntryAtomically() {
        LocalDate date = LocalDate.now();
        FoodEntry entry = buildEntry("Egg", 70, 6, 0, 5);
        NutritionLog savedLog = buildNutritionLog("u1", date, 0);
        savedLog.getEntries().add(entry);

        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(NutritionLog.class)))
                .thenReturn(savedLog);

        NutritionLog result = nutritionService.addFoodEntry("u1", date, entry);

        assertEquals(1, result.getEntries().size());
        verify(mongoTemplate).findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(NutritionLog.class));
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
        FoodEntry entry = new FoodEntry();
        entry.setFoodName(name);
        entry.setMealType("Lunch");
        entry.setServingQty(1);
        entry.setServingUnit("serving");
        entry.setCalories(cal);
        entry.setProteinG(protein);
        entry.setCarbsG(carbs);
        entry.setFatG(fat);
        return entry;
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
