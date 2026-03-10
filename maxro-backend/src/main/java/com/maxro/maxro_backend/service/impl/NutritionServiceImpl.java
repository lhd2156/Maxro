package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.exception.ResourceNotFoundException;
import com.maxro.maxro_backend.model.FoodEntry;
import com.maxro.maxro_backend.model.NutritionLog;
import com.maxro.maxro_backend.repository.NutritionLogRepository;
import com.maxro.maxro_backend.service.NutritionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class NutritionServiceImpl implements NutritionService {

    private static final Logger log = LoggerFactory.getLogger(NutritionServiceImpl.class);

    private final NutritionLogRepository nutritionLogRepository;

    public NutritionServiceImpl(NutritionLogRepository nutritionLogRepository) {
        this.nutritionLogRepository = nutritionLogRepository;
    }

    @Override
    public NutritionLog logNutrition(String userId, LocalDate date, List<FoodEntry> entries) {
        log.info("Logging nutrition for user: {} on date: {}", userId, date);

        NutritionLog nutritionLog = nutritionLogRepository.findByUserIdAndDate(userId, date)
                .orElseGet(() -> {
                    NutritionLog newLog = new NutritionLog();
                    newLog.setUserId(userId);
                    newLog.setDate(date);
                    newLog.setEntries(new ArrayList<>());
                    return newLog;
                });

        nutritionLog.getEntries().addAll(entries);
        NutritionLog saved = nutritionLogRepository.save(nutritionLog);
        log.info("Nutrition logged with {} entries for date: {}", entries.size(), date);
        return saved;
    }

    @Override
    public NutritionLog addFoodEntry(String userId, LocalDate date, FoodEntry entry) {
        log.info("Adding food entry for user: {} on date: {}", userId, date);

        NutritionLog nutritionLog = nutritionLogRepository.findByUserIdAndDate(userId, date)
                .orElseGet(() -> {
                    NutritionLog newLog = new NutritionLog();
                    newLog.setUserId(userId);
                    newLog.setDate(date);
                    newLog.setEntries(new ArrayList<>());
                    return newLog;
                });

        nutritionLog.getEntries().add(entry);
        return nutritionLogRepository.save(nutritionLog);
    }

    @Override
    public NutritionLog removeFoodEntry(String userId, LocalDate date, String entryId) {
        log.info("Removing food entry: {} for user: {} on date: {}", entryId, userId, date);

        NutritionLog nutritionLog = nutritionLogRepository.findByUserIdAndDate(userId, date)
                .orElseThrow(() -> new ResourceNotFoundException("NutritionLog", "date", date.toString()));

        boolean removed = nutritionLog.getEntries().removeIf(e -> e.getId().equals(entryId));
        if (!removed) {
            throw new ResourceNotFoundException("FoodEntry", "id", entryId);
        }

        return nutritionLogRepository.save(nutritionLog);
    }

    @Override
    public NutritionLog getNutritionLog(String userId, LocalDate date) {
        log.debug("Fetching nutrition log for user: {} on date: {}", userId, date);
        return nutritionLogRepository.findByUserIdAndDate(userId, date).orElse(null);
    }

    @Override
    public List<NutritionLog> getNutritionLogs(String userId, LocalDate startDate, LocalDate endDate) {
        log.debug("Fetching nutrition logs for user: {} from {} to {}", userId, startDate, endDate);
        return nutritionLogRepository.findByUserIdAndDateBetweenFlexible(userId, startDate.toString(), endDate.toString(), startDate, endDate);
    }
}
