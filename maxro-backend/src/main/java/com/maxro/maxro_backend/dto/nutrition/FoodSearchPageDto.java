package com.maxro.maxro_backend.dto.nutrition;

import java.util.List;

public record FoodSearchPageDto(
        int currentPage,
        int totalPages,
        int totalHits,
        List<FoodSearchResultDto> foods
) {}
