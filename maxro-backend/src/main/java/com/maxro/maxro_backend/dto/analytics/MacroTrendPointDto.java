package com.maxro.maxro_backend.dto.analytics;

public record MacroTrendPointDto(
        String date,
        double calories,
        double proteinG,
        double carbsG,
        double fatG
) {}
