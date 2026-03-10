package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.model.FoodEntry;
import com.maxro.maxro_backend.model.NutritionLog;

import java.time.LocalDate;
import java.util.List;

public interface NutritionService {

    NutritionLog logNutrition(String userId, LocalDate date, List<FoodEntry> entries);

    NutritionLog addFoodEntry(String userId, LocalDate date, FoodEntry entry);

    NutritionLog removeFoodEntry(String userId, LocalDate date, String entryId);

    NutritionLog getNutritionLog(String userId, LocalDate date);

    List<NutritionLog> getNutritionLogs(String userId, LocalDate startDate, LocalDate endDate);
}
