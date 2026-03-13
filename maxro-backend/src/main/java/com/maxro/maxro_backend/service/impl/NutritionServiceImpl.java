package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.exception.ResourceNotFoundException;
import com.maxro.maxro_backend.model.FoodEntry;
import com.maxro.maxro_backend.model.NutritionLog;
import com.maxro.maxro_backend.repository.NutritionLogRepository;
import com.maxro.maxro_backend.service.NutritionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class NutritionServiceImpl implements NutritionService {

    private static final Logger log = LoggerFactory.getLogger(NutritionServiceImpl.class);
    private static final FindAndModifyOptions UPSERT_AND_RETURN_NEW =
            FindAndModifyOptions.options().upsert(true).returnNew(true);

    private final NutritionLogRepository nutritionLogRepository;
    private final MongoTemplate mongoTemplate;

    public NutritionServiceImpl(NutritionLogRepository nutritionLogRepository,
                                MongoTemplate mongoTemplate) {
        this.nutritionLogRepository = nutritionLogRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public NutritionLog logNutrition(String userId, LocalDate date, List<FoodEntry> entries) {
        log.info("Logging nutrition for user: {} on date: {}", userId, date);
        return appendEntries(userId, date, entries);
    }

    @Override
    public NutritionLog addFoodEntry(String userId, LocalDate date, FoodEntry entry) {
        log.info("Adding food entry for user: {} on date: {}", userId, date);
        return appendEntries(userId, date, List.of(entry));
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

    private NutritionLog appendEntries(String userId, LocalDate date, List<FoodEntry> entries) {
        if (entries == null || entries.isEmpty()) {
            return ensureLogExists(userId, date);
        }

        Object[] entryDocuments = entries.toArray();
        Query query = userDateQuery(userId, date);
        Update update = new Update()
                .setOnInsert("userId", userId)
                .setOnInsert("date", date)
                .push("entries")
                .each(entryDocuments);

        NutritionLog updatedLog = mongoTemplate.findAndModify(
                query,
                update,
                UPSERT_AND_RETURN_NEW,
                NutritionLog.class
        );

        return updatedLog != null ? updatedLog : ensureLogExists(userId, date);
    }

    private NutritionLog ensureLogExists(String userId, LocalDate date) {
        return nutritionLogRepository.findByUserIdAndDate(userId, date)
                .orElseGet(() -> {
                    NutritionLog newLog = new NutritionLog();
                    newLog.setUserId(userId);
                    newLog.setDate(date);
                    newLog.setEntries(new ArrayList<>());
                    return nutritionLogRepository.save(newLog);
                });
    }

    private Query userDateQuery(String userId, LocalDate date) {
        return Query.query(Criteria.where("userId").is(userId).and("date").is(date));
    }
}