package com.maxro.maxro_backend.dto.nutrition;

public record FoodSearchResultDto(
        String foodName,
        String brandName,
        double servingQty,
        String servingUnit,
        double calories,
        double proteinG,
        double carbsG,
        double fatG,
        double fiberG,
        double sugarG,
        double sodiumMg,
        double cholesterolMg,
        double saturatedFatG,
        double potassiumMg,
        String thumbnailUrl
) {}
