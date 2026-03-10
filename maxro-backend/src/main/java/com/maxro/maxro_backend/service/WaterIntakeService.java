package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.model.WaterIntake;

import java.time.LocalDate;
import java.util.List;

public interface WaterIntakeService {

    WaterIntake logWater(String userId, LocalDate date, double amountOz);

    WaterIntake getWaterIntake(String userId, LocalDate date);

    List<WaterIntake> getWaterIntakeLogs(String userId, LocalDate startDate, LocalDate endDate);
}
