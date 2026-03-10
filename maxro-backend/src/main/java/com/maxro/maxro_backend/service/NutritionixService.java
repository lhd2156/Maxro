package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.dto.nutrition.FoodSearchResultDto;

import java.util.List;

public interface NutritionixService {

    List<FoodSearchResultDto> searchFood(String query);

    /**
     * Look up food by UPC/barcode. Returns empty list if API disabled or not found.
     */
    List<FoodSearchResultDto> searchByBarcode(String upc);
}
