package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.dto.nutrition.FoodSearchResultDto;
import com.maxro.maxro_backend.model.FoodEntry;
import com.maxro.maxro_backend.model.NutritionLog;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.NutritionService;
import com.maxro.maxro_backend.service.NutritionixService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Controller
public class NutritionResolver {

    private final NutritionService nutritionService;
    private final NutritionixService nutritionixService;
    private final SecurityContextHelper securityContextHelper;

    public NutritionResolver(NutritionService nutritionService,
                             NutritionixService nutritionixService,
                             SecurityContextHelper securityContextHelper) {
        this.nutritionService = nutritionService;
        this.nutritionixService = nutritionixService;
        this.securityContextHelper = securityContextHelper;
    }

    @QueryMapping
    public NutritionLog getNutritionLog(@Argument String date) {
        return nutritionService.getNutritionLog(
                securityContextHelper.getCurrentUserId(), LocalDate.parse(date));
    }

    @QueryMapping
    public List<NutritionLog> getNutritionLogs(@Argument String startDate, @Argument String endDate) {
        return nutritionService.getNutritionLogs(
                securityContextHelper.getCurrentUserId(),
                LocalDate.parse(startDate), LocalDate.parse(endDate));
    }

    @QueryMapping
    public List<FoodSearchResultDto> searchFood(@Argument String query) {
        return nutritionixService.searchFood(query);
    }

    @SuppressWarnings("unchecked")
    @MutationMapping
    public NutritionLog logNutrition(@Argument Map<String, Object> input) {
        String userId = securityContextHelper.getCurrentUserId();
        LocalDate date = LocalDate.parse((String) input.get("date"));
        List<Map<String, Object>> entryInputs = (List<Map<String, Object>>) input.get("entries");
        List<FoodEntry> entries = entryInputs.stream().map(this::mapToFoodEntry).toList();
        return nutritionService.logNutrition(userId, date, entries);
    }

    @MutationMapping
    public NutritionLog addFoodEntry(@Argument String date, @Argument Map<String, Object> input) {
        String userId = securityContextHelper.getCurrentUserId();
        FoodEntry entry = mapToFoodEntry(input);
        return nutritionService.addFoodEntry(userId, LocalDate.parse(date), entry);
    }

    @MutationMapping
    public NutritionLog removeFoodEntry(@Argument String date, @Argument String entryId) {
        return nutritionService.removeFoodEntry(
                securityContextHelper.getCurrentUserId(), LocalDate.parse(date), entryId);
    }

    private FoodEntry mapToFoodEntry(Map<String, Object> input) {
        FoodEntry entry = new FoodEntry();
        entry.setFoodName((String) input.get("foodName"));
        entry.setBrandName((String) input.get("brandName"));
        entry.setMealType((String) input.get("mealType"));
        entry.setServingQty(getDouble(input, "servingQty"));
        entry.setServingUnit((String) input.get("servingUnit"));
        entry.setCalories(getDouble(input, "calories"));
        entry.setProteinG(getDouble(input, "proteinG"));
        entry.setCarbsG(getDouble(input, "carbsG"));
        entry.setFatG(getDouble(input, "fatG"));
        entry.setFiberG(getDouble(input, "fiberG"));
        entry.setSugarG(getDouble(input, "sugarG"));
        entry.setSodiumMg(getDouble(input, "sodiumMg"));
        entry.setCholesterolMg(getDouble(input, "cholesterolMg"));
        entry.setSaturatedFatG(getDouble(input, "saturatedFatG"));
        entry.setPotassiumMg(getDouble(input, "potassiumMg"));
        entry.setThumbnailUrl((String) input.get("thumbnailUrl"));
        return entry;
    }

    private double getDouble(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return 0.0;
    }
}
