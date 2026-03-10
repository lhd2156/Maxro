package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.model.WaterEntry;
import com.maxro.maxro_backend.model.WaterIntake;
import com.maxro.maxro_backend.repository.UserRepository;
import com.maxro.maxro_backend.repository.WaterIntakeRepository;
import com.maxro.maxro_backend.service.WaterIntakeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class WaterIntakeServiceImpl implements WaterIntakeService {

    private static final Logger log = LoggerFactory.getLogger(WaterIntakeServiceImpl.class);
    private static final double DEFAULT_WATER_GOAL_OZ = 64.0;

    private final WaterIntakeRepository waterIntakeRepository;
    private final UserRepository userRepository;

    public WaterIntakeServiceImpl(WaterIntakeRepository waterIntakeRepository,
                                  UserRepository userRepository) {
        this.waterIntakeRepository = waterIntakeRepository;
        this.userRepository = userRepository;
    }

    @Override
    public WaterIntake logWater(String userId, LocalDate date, double amountOz) {
        log.info("Logging {} oz water for user: {} on date: {}", amountOz, userId, date);

        WaterIntake waterIntake = waterIntakeRepository.findByUserIdAndDate(userId, date)
                .orElseGet(() -> {
                    WaterIntake newIntake = new WaterIntake();
                    newIntake.setUserId(userId);
                    newIntake.setDate(date);
                    newIntake.setEntries(new ArrayList<>());
                    newIntake.setGoalOz(getUserWaterGoal(userId));
                    return newIntake;
                });

        waterIntake.getEntries().add(new WaterEntry(amountOz));
        WaterIntake saved = waterIntakeRepository.save(waterIntake);

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

    private double getUserWaterGoal(String userId) {
        return userRepository.findById(userId)
                .map(user -> user.getDailyWaterGoalOz() != null ? user.getDailyWaterGoalOz() : DEFAULT_WATER_GOAL_OZ)
                .orElse(DEFAULT_WATER_GOAL_OZ);
    }
}
