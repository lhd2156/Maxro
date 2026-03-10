package com.maxro.maxro_backend.dto.analytics;

public record WaterTrendPointDto(
        String date,
        double totalOz,
        double goalOz,
        boolean goalMet
) {}
