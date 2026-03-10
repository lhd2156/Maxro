package com.maxro.maxro_backend.dto.analytics;

public record StrengthDataPointDto(
        String date,
        double maxWeightLbs,
        double estimatedOneRepMax,
        double totalVolume
) {}
