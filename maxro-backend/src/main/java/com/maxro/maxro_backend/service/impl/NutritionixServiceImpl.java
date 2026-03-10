package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.dto.nutrition.FoodSearchResultDto;
import com.maxro.maxro_backend.service.NutritionixService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Searches for food data. Uses the Nutritionix API when credentials
 * are configured, otherwise falls back to a built-in food database
 * so the app works out-of-the-box without any API keys.
 */
@Service
public class NutritionixServiceImpl implements NutritionixService {

    private static final Logger log = LoggerFactory.getLogger(NutritionixServiceImpl.class);

    private final WebClient nutritionixWebClient;
    private final boolean apiEnabled;
    private final List<FoodSearchResultDto> localFoods;

    public NutritionixServiceImpl(WebClient nutritionixWebClient,
                                   @Value("${maxro.nutritionix.app-id:}") String appId) {
        this.nutritionixWebClient = nutritionixWebClient;
        this.apiEnabled = appId != null && !appId.isBlank();
        this.localFoods = buildLocalFoodDatabase();
    }

    @Override
    public List<FoodSearchResultDto> searchFood(String query) {
        if (apiEnabled && looksLikeBarcode(query)) {
            List<FoodSearchResultDto> barcodeResults = searchByBarcode(query.trim());
            if (!barcodeResults.isEmpty()) return barcodeResults;
            log.debug("Barcode lookup returned no results, falling back to natural search");
        }
        if (apiEnabled) {
            return searchNutritionix(query);
        }
        return searchLocal(query);
    }

    @Override
    public List<FoodSearchResultDto> searchByBarcode(String upc) {
        if (!apiEnabled) {
            log.debug("Nutritionix API not configured, barcode lookup unavailable");
            return Collections.emptyList();
        }
        log.info("Looking up barcode: {}", upc);
        try {
            Map<String, Object> response = nutritionixWebClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/search/item").queryParam("upc", upc).build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null) return Collections.emptyList();

            Object foodsObj = response.get("foods");
            if (foodsObj instanceof List<?> foodsList && !foodsList.isEmpty()) {
                return foodsList.stream()
                        .filter(f -> f instanceof Map)
                        .map(f -> mapToFoodSearchResult((Map<String, Object>) f))
                        .toList();
            }
            return Collections.emptyList();
        } catch (WebClientResponseException e) {
            log.warn("Nutritionix barcode API error: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Error calling Nutritionix barcode API", e);
            return Collections.emptyList();
        }
    }

    private boolean looksLikeBarcode(String query) {
        if (query == null || query.isBlank()) return false;
        String trimmed = query.trim();
        return trimmed.length() >= 8 && trimmed.length() <= 14 && trimmed.matches("\\d+");
    }

    @SuppressWarnings("unchecked")
    private List<FoodSearchResultDto> searchNutritionix(String query) {
        log.info("Searching Nutritionix for: {}", query);
        try {
            Map<String, Object> response = nutritionixWebClient.post()
                    .uri("/natural/nutrients")
                    .bodyValue(Map.of("query", query))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null || !response.containsKey("foods")) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> foods = (List<Map<String, Object>>) response.get("foods");
            return foods.stream().map(this::mapToFoodSearchResult).toList();

        } catch (WebClientResponseException e) {
            log.error("Nutritionix API error: {} — falling back to local DB", e.getStatusCode());
            return searchLocal(query);
        } catch (Exception e) {
            log.error("Error calling Nutritionix API — falling back to local DB", e);
            return searchLocal(query);
        }
    }

    private List<FoodSearchResultDto> searchLocal(String query) {
        log.debug("Searching local food database for: {}", query);
        String q = query.toLowerCase().trim();
        return localFoods.stream()
                .filter(f -> f.foodName().toLowerCase().contains(q)
                        || (f.brandName() != null && f.brandName().toLowerCase().contains(q)))
                .limit(5)
                .collect(Collectors.toList());
    }

    private FoodSearchResultDto mapToFoodSearchResult(Map<String, Object> food) {
        return new FoodSearchResultDto(
                getStringValue(food, "food_name"),
                getStringValue(food, "brand_name"),
                getDoubleValue(food, "serving_qty"),
                getStringValue(food, "serving_unit"),
                getDoubleValue(food, "nf_calories"),
                getDoubleValue(food, "nf_protein"),
                getDoubleValue(food, "nf_total_carbohydrate"),
                getDoubleValue(food, "nf_total_fat"),
                getDoubleValue(food, "nf_dietary_fiber"),
                getDoubleValue(food, "nf_sugars"),
                getDoubleValue(food, "nf_sodium"),
                getDoubleValue(food, "nf_cholesterol"),
                getDoubleValue(food, "nf_saturated_fat"),
                getDoubleValue(food, "nf_potassium"),
                extractThumbUrl(food)
        );
    }

    @SuppressWarnings("unchecked")
    private String extractThumbUrl(Map<String, Object> food) {
        Object photo = food.get("photo");
        if (photo instanceof Map) {
            Object thumb = ((Map<String, Object>) photo).get("thumb");
            return thumb != null ? thumb.toString() : null;
        }
        return null;
    }

    private String getStringValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? value.toString() : null;
    }

    private double getDoubleValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number number) return number.doubleValue();
        return 0.0;
    }

    private List<FoodSearchResultDto> buildLocalFoodDatabase() {
        List<FoodSearchResultDto> foods = new ArrayList<>();
        foods.add(food("chicken breast", null, 4, "oz", 187, 35, 0, 4, 0, 0, 65, 85, 1.1, 256));
        foods.add(food("grilled chicken breast", null, 4, "oz", 187, 35, 0, 4, 0, 0, 65, 85, 1.1, 256));
        foods.add(food("chicken thigh", null, 4, "oz", 232, 28, 0, 13, 0, 0, 84, 105, 3.6, 237));
        foods.add(food("chicken wings", null, 4, "wings", 320, 27, 0, 22, 0, 0, 260, 120, 6, 180));
        foods.add(food("raising canes chicken fingers", "Raising Cane's", 3, "fingers", 510, 38, 24, 28, 1, 0, 990, 75, 5, 350));
        foods.add(food("raising canes combo", "Raising Cane's", 1, "box combo", 1250, 65, 112, 58, 4, 8, 2180, 120, 12, 680));
        foods.add(food("raising canes toast", "Raising Cane's", 1, "slice", 140, 3, 15, 7, 1, 1, 170, 0, 1.5, 30));
        foods.add(food("raising canes coleslaw", "Raising Cane's", 1, "individual", 200, 1, 14, 16, 2, 10, 190, 10, 2.5, 120));
        foods.add(food("raising canes crinkle-cut fries", "Raising Cane's", 1, "regular", 290, 4, 39, 13, 3, 0, 140, 0, 2, 480));
        foods.add(food("raising canes cane's sauce", "Raising Cane's", 1, "serving", 190, 0, 5, 19, 0, 2, 350, 15, 3, 20));
        foods.add(food("salmon fillet", null, 4, "oz", 234, 25, 0, 14, 0, 0, 59, 71, 3.1, 534));
        foods.add(food("ground beef 80/20", null, 4, "oz", 287, 19, 0, 23, 0, 0, 75, 81, 9, 270));
        foods.add(food("ground turkey", null, 4, "oz", 170, 21, 0, 9, 0, 0, 85, 80, 2.5, 280));
        foods.add(food("steak sirloin", null, 4, "oz", 207, 33, 0, 7.5, 0, 0, 57, 76, 3, 350));
        foods.add(food("egg", null, 1, "large", 72, 6, 0, 5, 0, 0, 71, 186, 1.6, 69));
        foods.add(food("egg whites", null, 3, "large", 51, 11, 0, 0.2, 0, 0, 164, 0, 0, 150));
        foods.add(food("whole milk", null, 1, "cup", 149, 8, 12, 8, 0, 12, 105, 24, 4.6, 322));
        foods.add(food("protein shake", null, 1, "scoop", 120, 24, 3, 1.5, 1, 1, 130, 35, 0.5, 200));
        foods.add(food("whey protein powder", null, 1, "scoop", 120, 24, 3, 1.5, 0, 1, 95, 55, 0.5, 160));
        foods.add(food("greek yogurt", null, 1, "cup", 130, 17, 9, 0.7, 0, 7, 68, 10, 0.4, 240));
        foods.add(food("white rice", null, 1, "cup cooked", 206, 4, 45, 0.4, 0.6, 0, 1, 0, 0.1, 55));
        foods.add(food("brown rice", null, 1, "cup cooked", 216, 5, 45, 1.8, 3.5, 0.7, 10, 0, 0.4, 84));
        foods.add(food("pasta", null, 1, "cup cooked", 220, 8, 43, 1.3, 2.5, 0.8, 1, 0, 0.2, 62));
        foods.add(food("oatmeal", null, 1, "cup cooked", 166, 6, 28, 3.6, 4, 0.6, 9, 0, 0.6, 164));
        foods.add(food("bread whole wheat", null, 1, "slice", 81, 4, 14, 1.1, 1.9, 1.5, 146, 0, 0.2, 69));
        foods.add(food("banana", null, 1, "medium", 105, 1.3, 27, 0.4, 3.1, 14, 1, 0, 0.1, 422));
        foods.add(food("apple", null, 1, "medium", 95, 0.5, 25, 0.3, 4.4, 19, 2, 0, 0.1, 195));
        foods.add(food("avocado", null, 1, "whole", 322, 4, 17, 29, 13.5, 1, 14, 0, 4.3, 975));
        foods.add(food("sweet potato", null, 1, "medium", 103, 2.3, 24, 0.1, 3.8, 7.4, 41, 0, 0, 438));
        foods.add(food("broccoli", null, 1, "cup", 55, 3.7, 11, 0.6, 5.1, 2.2, 33, 0, 0.1, 457));
        foods.add(food("spinach", null, 1, "cup raw", 7, 0.9, 1.1, 0.1, 0.7, 0.1, 24, 0, 0, 167));
        foods.add(food("almonds", null, 1, "oz (23 nuts)", 164, 6, 6, 14, 3.5, 1.2, 0, 0, 1.1, 208));
        foods.add(food("peanut butter", null, 2, "tbsp", 188, 8, 6, 16, 2, 3, 136, 0, 3.3, 208));
        foods.add(food("olive oil", null, 1, "tbsp", 119, 0, 0, 14, 0, 0, 0, 0, 1.9, 0));
        foods.add(food("cheese cheddar", null, 1, "oz", 113, 7, 0.4, 9.3, 0, 0.1, 176, 28, 5.9, 21));
        foods.add(food("pizza pepperoni", null, 1, "slice", 298, 13, 34, 12, 2.3, 3.6, 683, 28, 4.5, 172));
        foods.add(food("cheeseburger", null, 1, "burger", 535, 28, 36, 31, 1.5, 7, 1170, 88, 12, 340));
        foods.add(food("french fries", null, 1, "medium", 365, 4, 48, 17, 4, 0.3, 246, 0, 2.3, 567));
        foods.add(food("burrito chicken", null, 1, "burrito", 591, 32, 63, 21, 6, 3, 1340, 75, 8, 450));
        foods.add(food("chipotle burrito bowl", "Chipotle", 1, "bowl", 665, 38, 53, 28, 12, 3, 1480, 95, 9.5, 720));
        foods.add(food("chipotle chicken bowl", "Chipotle", 1, "bowl", 580, 42, 46, 18, 8, 2, 1250, 110, 6, 650));
        foods.add(food("chick-fil-a chicken sandwich", "Chick-fil-A", 1, "sandwich", 440, 28, 40, 19, 1, 5, 1400, 55, 4, 300));
        foods.add(food("chick-fil-a nuggets", "Chick-fil-A", 8, "nuggets", 250, 27, 11, 11, 0.5, 1, 1090, 70, 2.5, 250));
        foods.add(food("chick-fil-a waffle fries", "Chick-fil-A", 1, "medium", 420, 5, 45, 24, 5, 0, 280, 0, 4, 540));
        foods.add(food("mcdonald's big mac", "McDonald's", 1, "burger", 550, 25, 45, 30, 3, 9, 1010, 80, 11, 380));
        foods.add(food("mcdonald's mcnuggets", "McDonald's", 10, "pieces", 410, 24, 25, 24, 1, 0, 900, 55, 4, 280));
        foods.add(food("subway turkey sub", "Subway", 1, "6-inch", 280, 18, 40, 4, 3, 6, 790, 25, 1, 260));
        foods.add(food("taco bell crunchy taco", "Taco Bell", 1, "taco", 170, 8, 13, 10, 3, 1, 310, 25, 4, 120));
        return foods;
    }

    private FoodSearchResultDto food(String name, String brand, double qty, String unit,
                                      double cal, double protein, double carbs, double fat,
                                      double fiber, double sugar, double sodium,
                                      double cholesterol, double satFat, double potassium) {
        return new FoodSearchResultDto(name, brand, qty, unit, cal, protein, carbs, fat,
                fiber, sugar, sodium, cholesterol, satFat, potassium, null);
    }
}
