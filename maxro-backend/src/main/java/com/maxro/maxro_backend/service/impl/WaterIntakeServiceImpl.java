package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.model.User;
import com.maxro.maxro_backend.model.WaterEntry;
import com.maxro.maxro_backend.model.WaterIntake;
import com.maxro.maxro_backend.repository.UserRepository;
import com.maxro.maxro_backend.repository.WaterIntakeRepository;
import com.maxro.maxro_backend.service.WaterIntakeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class WaterIntakeServiceImpl implements WaterIntakeService {

    private static final Logger log = LoggerFactory.getLogger(WaterIntakeServiceImpl.class);
    private static final double DEFAULT_WATER_GOAL_OZ = 64.0;
    private static final FindAndModifyOptions UPSERT_AND_RETURN_NEW =
            FindAndModifyOptions.options().upsert(true).returnNew(true);

    private final WaterIntakeRepository waterIntakeRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    public WaterIntakeServiceImpl(WaterIntakeRepository waterIntakeRepository,
                                  UserRepository userRepository,
                                  MongoTemplate mongoTemplate) {
        this.waterIntakeRepository = waterIntakeRepository;
        this.userRepository = userRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public WaterIntake logWater(String userId, LocalDate date, double amountOz) {
        log.info("Logging {} oz water for user: {} on date: {}", amountOz, userId, date);

        WaterIntake saved = appendWaterEntry(userId, date, new WaterEntry(amountOz), getUserWaterGoal(userId));

        if (saved.isGoalMet()) {
            log.info("Water goal met for user: {} on date: {}", userId, date);
        }

        return saved;
    }

    @Override
    public WaterIntake getWaterIntake(String userId, LocalDate date) {
        log.debug("Fetching water intake for user: {} on date: {}", userId, date);
        return waterIntakeRepository.findByUserIdAndDate(userId, date).orElse(null);
    }

    @Override
    public List<WaterIntake> getWaterIntakeLogs(String userId, LocalDate startDate, LocalDate endDate) {
        log.debug("Fetching water intake logs for user: {} from {} to {}", userId, startDate, endDate);
        return waterIntakeRepository.findByUserIdAndDateBetweenFlexible(userId, startDate.toString(), endDate.toString(), startDate, endDate);
    }

    private WaterIntake appendWaterEntry(String userId, LocalDate date, WaterEntry entry, double goalOz) {
        Query query = Query.query(Criteria.where("userId").is(userId).and("date").is(date));
        Update update = new Update()
                .setOnInsert("userId", userId)
                .setOnInsert("date", date)
                .setOnInsert("goalOz", goalOz)
                .push("entries", entry);

        WaterIntake updatedIntake = mongoTemplate.findAndModify(
                query,
                update,
                UPSERT_AND_RETURN_NEW,
                WaterIntake.class
        );

        return updatedIntake != null ? updatedIntake : getWaterIntake(userId, date);
    }

    private double getUserWaterGoal(String userId) {
        return userRepository.findById(userId)
                .map(User::getDailyWaterGoalOz)
                .filter(goal -> goal != null && goal > 0)
                .orElse(DEFAULT_WATER_GOAL_OZ);
    }
}
