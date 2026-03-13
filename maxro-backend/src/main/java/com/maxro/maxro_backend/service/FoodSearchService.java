package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.dto.nutrition.FoodSearchPageDto;

public interface FoodSearchService {

    FoodSearchPageDto searchFood(String query, int page, int size);
}
