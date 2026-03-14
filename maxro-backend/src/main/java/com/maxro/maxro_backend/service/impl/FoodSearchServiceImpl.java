package com.maxro.maxro_backend.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maxro.maxro_backend.dto.nutrition.FoodSearchPageDto;
import com.maxro.maxro_backend.dto.nutrition.FoodSearchResultDto;
import com.maxro.maxro_backend.service.FoodSearchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class FoodSearchServiceImpl implements FoodSearchService {

    private static final Logger log = LoggerFactory.getLogger(FoodSearchServiceImpl.class);
    private static final int MAX_PAGE_SIZE = 10;
    private static final int USDA_SEARCH_WINDOW_SIZE = 80;
    private static final int FATSECRET_SEARCH_WINDOW_MULTIPLIER = 4;
    private static final int FATSECRET_SEARCH_WINDOW_CAP = 120;
    private static final long SEARCH_CACHE_TTL_MS = 5 * 60_000L;
    private static final long FOOD_CACHE_TTL_MS = 30 * 60_000L;
    private static final long FATSECRET_TOKEN_BUFFER_MS = 60_000L;
    private static final double DAILY_VALUE_VITAMIN_A_MCG = 900d;
    private static final double DAILY_VALUE_VITAMIN_C_MG = 90d;
    private static final double DAILY_VALUE_CALCIUM_MG = 1300d;
    private static final double DAILY_VALUE_IRON_MG = 18d;
    private static final Pattern FATSECRET_SUMMARY_SERVING_PATTERN = Pattern.compile("(?i)^per\\s+(.+?)\\s+-");
    private static final Pattern FATSECRET_SUMMARY_CALORIES_PATTERN = Pattern.compile("(?i)calories:\\s*([0-9.]+)");
    private static final Pattern FATSECRET_SUMMARY_FAT_PATTERN = Pattern.compile("(?i)fat:\\s*([0-9.]+)");
    private static final Pattern FATSECRET_SUMMARY_CARBS_PATTERN = Pattern.compile("(?i)carbs:\\s*([0-9.]+)");
    private static final Pattern FATSECRET_SUMMARY_PROTEIN_PATTERN = Pattern.compile("(?i)protein:\\s*([0-9.]+)");
    private static final List<String> GENERAL_FOOD_DATA_TYPES = List.of("Branded", "Survey (FNDDS)", "Foundation", "SR Legacy");
    private static final List<String> PREPARED_FOOD_DATA_TYPES = List.of("Branded", "Survey (FNDDS)", "SR Legacy");
    private static final Set<String> PREPARED_FOOD_TERMS = Set.of(
            "box", "bowl", "breakfast", "burger", "burrito", "combo", "finger", "fingers", "fries", "meal",
            "nugget", "nuggets", "pizza", "platter", "quesadilla", "salad", "sandwich", "strip", "strips",
            "sub", "taco", "toast", "wrap"
    );
        private static final Set<String> RECIPE_LIKE_TERMS = Set.of(
            "dressing", "dip", "mix", "sauce", "with", "flavor", "flavoured", "sweetened", "prepared", "recipe"
        );
                private static final Set<String> SIMPLE_PREPARATION_TERMS = Set.of(
                "raw", "fresh", "plain", "dry", "cooked", "boiled", "baked", "steamed", "roasted"
            );
                private static final Set<String> NATURAL_FORM_TERMS = Set.of(
                    "raw", "fresh", "plain", "whole", "uncooked"
                );
                private static final Set<String> PROCESSED_FORM_TERMS = Set.of(
                    "candied", "patty", "patties", "tots", "nugget", "nuggets", "pudding", "split", "juice",
                        "nectar", "breaded", "frozen", "flavored", "flavoured", "sweetened", "canned", "packed",
                        "salad", "noodles", "milk", "powder", "stuffing", "sweet", "dessert", "fried", "dough"
                );
    private static final Set<String> RESTAURANT_HINTS = Set.of(
            "arbys", "burger", "cafe", "canes", "cfa", "chick", "chickfila", "chipotle", "dunkin", "five", "guys", "kfc", "mcdonalds",
            "panera", "papa", "popeyes", "raising", "shake", "sonic", "starbucks", "subway", "taco", "wendys"
    );
        private static final Set<String> BRANDED_FOOD_HINTS = Set.of(
            "liquid", "iv", "quest", "gatorade", "powerade", "prime", "fairlife", "muscle", "core", "protein", "ghost", "celsius", "redbull"
        );

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String fatSecretClientId;
    private final String fatSecretClientSecret;
    private final String fatSecretBaseUrl;
    private final String fatSecretTokenUrl;
    private final Map<String, CachedValue<FatSecretSearchPage>> fatSecretSearchCache = new ConcurrentHashMap<>();
    private final Map<String, CachedValue<FoodSearchResultDto>> fatSecretFoodCache = new ConcurrentHashMap<>();
    private final Object fatSecretTokenLock = new Object();
    private volatile FatSecretToken fatSecretToken;

    public FoodSearchServiceImpl(ObjectMapper objectMapper,
                                 @Value("${maxro.usda.api-key:}") String apiKey,
                                 @Value("${maxro.usda.base-url:https://api.nal.usda.gov/fdc/v1}") String baseUrl,
                                 @Value("${maxro.fatsecret.client-id:}") String fatSecretClientId,
                                 @Value("${maxro.fatsecret.client-secret:}") String fatSecretClientSecret,
                                 @Value("${maxro.fatsecret.base-url:https://platform.fatsecret.com/rest/server.api}") String fatSecretBaseUrl,
                                 @Value("${maxro.fatsecret.token-url:https://oauth.fatsecret.com/connect/token}") String fatSecretTokenUrl) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = (baseUrl == null || baseUrl.isBlank()) ? "https://api.nal.usda.gov/fdc/v1" : baseUrl.trim();
        this.fatSecretClientId = fatSecretClientId == null ? "" : fatSecretClientId.trim();
        this.fatSecretClientSecret = fatSecretClientSecret == null ? "" : fatSecretClientSecret.trim();
        this.fatSecretBaseUrl = (fatSecretBaseUrl == null || fatSecretBaseUrl.isBlank()) ? "https://platform.fatsecret.com/rest/server.api" : fatSecretBaseUrl.trim();
        this.fatSecretTokenUrl = (fatSecretTokenUrl == null || fatSecretTokenUrl.isBlank()) ? "https://oauth.fatsecret.com/connect/token" : fatSecretTokenUrl.trim();
    }

    @Override
    public FoodSearchPageDto searchFood(String query, int page, int size) {
        String normalizedQuery = normalizeSearchQuery(query);
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));

        if (normalizedQuery.isBlank()) {
            return emptyPage(safePage);
        }

        FoodSearchPageDto fatSecretPage = hasFatSecretCredentials()
                ? searchFatSecretPage(normalizedQuery, safePage, safeSize)
                : emptyPage(safePage);

        if (shouldReturnFatSecretImmediately(normalizedQuery, fatSecretPage)) {
            return fatSecretPage;
        }

        FoodSearchPageDto usdaPage = searchUsdaPage(normalizedQuery, safePage, safeSize);
        if (shouldPreferFatSecret(normalizedQuery, fatSecretPage, usdaPage)) {
            return fatSecretPage;
        }

        if (!usdaPage.foods().isEmpty()) {
            return usdaPage;
        }

        FoodSearchPageDto curatedFallbackPage = buildCuratedRestaurantFallbackPage(normalizedQuery, safePage, safeSize);
        if (!curatedFallbackPage.foods().isEmpty()) {
            return curatedFallbackPage;
        }

        return !fatSecretPage.foods().isEmpty() ? fatSecretPage : emptyPage(safePage);
    }

    private FoodSearchPageDto searchUsdaPage(String query, int page, int size) {
        if (apiKey.isBlank()) {
            log.warn("USDA FoodData Central API key is missing; returning empty USDA food search results");
            return emptyPage(page);
        }

        try {
            List<Map<String, Object>> rankedFoods = prioritizeRestaurantVariety(fetchRankedFoods(query), query);
            if (rankedFoods.isEmpty()) {
                return emptyPage(page);
            }

            int totalHits = rankedFoods.size();
            int totalPages = Math.max(1, (int) Math.ceil((double) totalHits / size));
            int currentPage = Math.min(page, totalPages);
            int fromIndex = Math.min((currentPage - 1) * size, totalHits);
            int toIndex = Math.min(fromIndex + size, totalHits);

            List<FoodSearchResultDto> foods = rankedFoods.subList(fromIndex, toIndex).stream()
                    .map(this::mapToFoodSearchResult)
                    .toList();

            return new FoodSearchPageDto(currentPage, totalPages, totalHits, foods);
        } catch (Exception exception) {
            log.error("FoodData Central search failed", exception);
            return emptyPage(page);
        }
    }

    private FoodSearchPageDto searchFatSecretPage(String query, int page, int size) {
        if (!hasFatSecretCredentials()) {
            return emptyPage(page);
        }

        try {
            FatSecretSearchPage searchPage = fetchFatSecretSearchPage(query, page, size);
            if (searchPage.items().isEmpty()) {
                return emptyPage(page);
            }

            int currentPage = Math.min(page, searchPage.totalPages());
            int fromIndex = Math.min((currentPage - 1) * size, searchPage.items().size());
            int toIndex = Math.min(fromIndex + size, searchPage.items().size());
            List<FoodSearchResultDto> foods = new ArrayList<>();
            for (FatSecretFoodSearchItem item : searchPage.items().subList(fromIndex, toIndex)) {
                foods.add(mapFatSecretSearchItem(item));
            }
            return new FoodSearchPageDto(currentPage, searchPage.totalPages(), searchPage.totalHits(), foods);
        } catch (Exception exception) {
            log.error("FatSecret search failed for query '{}'", query, exception);
            return emptyPage(page);
        }
    }

    private boolean shouldReturnFatSecretImmediately(String query, FoodSearchPageDto fatSecretPage) {
        if (fatSecretPage.foods().isEmpty()) {
            return false;
        }
        if (containsRestaurantHint(query)) {
            if (hasStrongRestaurantBrandMatch(fatSecretPage.foods(), query)) {
                return true;
            }
            return scoreResultPage(fatSecretPage.foods(), query, true) >= 72d;
        }
        return false;
    }

    private boolean shouldPreferFatSecret(String query, FoodSearchPageDto fatSecretPage, FoodSearchPageDto usdaPage) {
        if (fatSecretPage.foods().isEmpty()) {
            return false;
        }
        if (usdaPage.foods().isEmpty()) {
            return true;
        }
        if (containsRestaurantHint(query) && hasStrongRestaurantBrandMatch(fatSecretPage.foods(), query)) {
            return true;
        }

        double fatSecretScore = scoreResultPage(fatSecretPage.foods(), query, true);
        double usdaScore = scoreResultPage(usdaPage.foods(), query, false);

        if (containsRestaurantHint(query)) {
            return fatSecretScore + 2d >= usdaScore;
        }

        return fatSecretScore >= usdaScore + 16d;
    }

    private double scoreResultPage(List<FoodSearchResultDto> foods, String query, boolean brandedSource) {
        double bestScore = 0d;
        for (int index = 0; index < Math.min(3, foods.size()); index++) {
            double score = scoreSearchText(foods.get(index).foodName(), foods.get(index).brandName(), foods.get(index).servingUnit(), query, brandedSource, index);
            bestScore = Math.max(bestScore, score);
        }
        return bestScore;
    }

    private boolean hasStrongRestaurantBrandMatch(List<FoodSearchResultDto> foods, String query) {
        if (!containsRestaurantHint(query) || foods.isEmpty()) {
            return false;
        }

        Set<String> queryTokens = toWordSet(canonicalizeFatSecretQuery(query));
        if (queryTokens.isEmpty()) {
            return false;
        }

        for (FoodSearchResultDto food : foods) {
            Set<String> brandTokens = toWordSet(food.brandName());
            Set<String> foodTokens = toWordSet(food.foodName());
            int brandMatches = 0;
            int foodMatches = 0;

            for (String token : queryTokens) {
                if (brandTokens.contains(token)) {
                    brandMatches++;
                }
                if (foodTokens.contains(token)) {
                    foodMatches++;
                }
            }

            if (brandMatches >= Math.min(2, queryTokens.size())) {
                return true;
            }
            if (brandMatches >= 1 && foodMatches >= 1) {
                return true;
            }
        }

        return false;
    }

    private FatSecretSearchPage fetchFatSecretSearchPage(String query, int page, int size) throws Exception {
        String canonicalQuery = canonicalizeFatSecretQuery(query);
        String cacheKey = canonicalQuery + "|" + page + "|" + size;
        long now = System.currentTimeMillis();
        CachedValue<FatSecretSearchPage> cachedValue = fatSecretSearchCache.get(cacheKey);
        if (cachedValue != null && cachedValue.isFresh(now)) {
            return cachedValue.value();
        }

        int windowSize = Math.min(
                Math.max(page * size * FATSECRET_SEARCH_WINDOW_MULTIPLIER, size * FATSECRET_SEARCH_WINDOW_MULTIPLIER),
                FATSECRET_SEARCH_WINDOW_CAP
        );
        Map<String, Object> response = requestFatSecret(Map.of(
                "method", "foods.search",
                "search_expression", canonicalQuery,
                "page_number", "0",
                "max_results", String.valueOf(windowSize),
                "format", "json"
        ));
        Map<String, Object> foodsNode = getMapNode(response, "foods");
        List<Map<String, Object>> rawFoods = getMapListNode(foodsNode, "food");
        List<FatSecretFoodSearchItem> rankedItems = new ArrayList<>();
        Set<String> seenFoodIds = new HashSet<>();
        int position = 0;

        for (Map<String, Object> rawFood : rawFoods) {
            String foodId = getStringValue(rawFood, "food_id");
            if (foodId == null || foodId.isBlank() || !seenFoodIds.add(foodId)) {
                continue;
            }

            String foodName = firstNonBlank(getStringValue(rawFood, "food_name"), "Unknown food");
            String brandName = getStringValue(rawFood, "brand_name");
            String foodType = getStringValue(rawFood, "food_type");
            String description = getStringValue(rawFood, "food_description");
            double rankingScore = scoreSearchText(foodName, brandName, description, query, true, position++);
            rankedItems.add(new FatSecretFoodSearchItem(foodId, foodName, brandName, foodType, description, rankingScore));
        }

        rankedItems.sort(Comparator.comparingDouble(FatSecretFoodSearchItem::rankingScore).reversed());
        int totalHits = Math.max(parsePositiveInt(foodsNode.get("total_results")), rankedItems.size());
        int totalPages = Math.max(1, (int) Math.ceil((double) totalHits / size));
        FatSecretSearchPage pageResult = new FatSecretSearchPage(Math.min(page, totalPages), totalPages, totalHits, rankedItems);
        fatSecretSearchCache.put(cacheKey, new CachedValue<>(pageResult, now + SEARCH_CACHE_TTL_MS));
        return pageResult;
    }

    private FoodSearchResultDto mapFatSecretSearchItem(FatSecretFoodSearchItem item) {
        long now = System.currentTimeMillis();
        CachedValue<FoodSearchResultDto> cachedValue = fatSecretFoodCache.get(item.foodId());
        if (cachedValue != null && cachedValue.isFresh(now)) {
            return cachedValue.value();
        }

        FoodSearchResultDto fallback = mapFatSecretSummaryFallback(item);
        try {
            Map<String, Object> response = requestFatSecret(Map.of(
                    "method", "food.get",
                    "food_id", item.foodId(),
                    "format", "json"
            ));
            Map<String, Object> foodNode = getMapNode(response, "food");
            FoodSearchResultDto detailedResult = mergeFatSecretDetail(foodNode, item, fallback);
            fatSecretFoodCache.put(item.foodId(), new CachedValue<>(detailedResult, now + FOOD_CACHE_TTL_MS));
            return detailedResult;
        } catch (Exception exception) {
            log.warn("FatSecret detail lookup failed for food_id={}", item.foodId(), exception);
            fatSecretFoodCache.put(item.foodId(), new CachedValue<>(fallback, now + FOOD_CACHE_TTL_MS));
            return fallback;
        }
    }

    private FoodSearchResultDto mergeFatSecretDetail(Map<String, Object> foodNode,
                                                     FatSecretFoodSearchItem item,
                                                     FoodSearchResultDto fallback) {
        if (foodNode.isEmpty()) {
            return fallback;
        }

        Map<String, Object> servingNode = selectBestFatSecretServing(foodNode);
        ServingInfo servingInfo = extractFatSecretServingInfo(servingNode, fallback);
        return normalizeFoodSearchResult(new FoodSearchResultDto(
                firstNonBlank(getStringValue(foodNode, "food_name"), fallback.foodName()),
                firstNonBlank(getStringValue(foodNode, "brand_name"), item.brandName(), fallback.brandName()),
                servingInfo.quantity(),
                servingInfo.unit(),
                coalescePositive(getDoubleValue(servingNode, "calories"), fallback.calories()),
                coalescePositive(getDoubleValue(servingNode, "protein"), fallback.proteinG()),
                coalescePositive(getDoubleValue(servingNode, "carbohydrate"), fallback.carbsG()),
                coalescePositive(getDoubleValue(servingNode, "fat"), fallback.fatG()),
                getDoubleValue(servingNode, "fiber"),
                getDoubleValue(servingNode, "sugar"),
                0d,
                getDoubleValue(servingNode, "sodium"),
                getDoubleValue(servingNode, "cholesterol"),
                getDoubleValue(servingNode, "saturated_fat"),
                getDoubleValue(servingNode, "potassium"),
                getDoubleValue(servingNode, "caffeine"),
                0d,
                percentToAmount(getDoubleValue(servingNode, "vitamin_a"), DAILY_VALUE_VITAMIN_A_MCG),
                percentToAmount(getDoubleValue(servingNode, "vitamin_c"), DAILY_VALUE_VITAMIN_C_MG),
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                percentToAmount(getDoubleValue(servingNode, "calcium"), DAILY_VALUE_CALCIUM_MG),
                percentToAmount(getDoubleValue(servingNode, "iron"), DAILY_VALUE_IRON_MG),
                0d,
                fallback.thumbnailUrl()
            ));
    }

    private FoodSearchResultDto mapFatSecretSummaryFallback(FatSecretFoodSearchItem item) {
        String description = firstNonBlank(item.foodDescription(), "");
        String servingLabel = extractFatSecretSummaryServing(description);
        ServingInfo servingInfo = parseServingLabel(servingLabel);
        return normalizeFoodSearchResult(new FoodSearchResultDto(
                item.foodName(),
                item.brandName(),
                servingInfo.quantity(),
                servingInfo.unit(),
                extractFatSecretSummaryMetric(FATSECRET_SUMMARY_CALORIES_PATTERN, description),
                extractFatSecretSummaryMetric(FATSECRET_SUMMARY_PROTEIN_PATTERN, description),
                extractFatSecretSummaryMetric(FATSECRET_SUMMARY_CARBS_PATTERN, description),
                extractFatSecretSummaryMetric(FATSECRET_SUMMARY_FAT_PATTERN, description),
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                null
            ));
    }

    private Map<String, Object> selectBestFatSecretServing(Map<String, Object> foodNode) {
        Map<String, Object> servingsNode = getMapNode(foodNode, "servings");
        List<Map<String, Object>> servings = getMapListNode(servingsNode, "serving");
        if (servings.isEmpty()) {
            return Collections.emptyMap();
        }
        for (Map<String, Object> serving : servings) {
            if (getBooleanish(serving, "is_default")) {
                return serving;
            }
        }
        for (Map<String, Object> serving : servings) {
            if (normalize(getStringValue(serving, "measurement_description")).contains("serving")) {
                return serving;
            }
        }
        return servings.get(0);
    }

    private ServingInfo extractFatSecretServingInfo(Map<String, Object> servingNode, FoodSearchResultDto fallback) {
        if (servingNode.isEmpty()) {
            return new ServingInfo(fallback.servingQty(), fallback.servingUnit());
        }

        double numberOfUnits = getDoubleValue(servingNode, "number_of_units");
        String measurementDescription = firstNonBlank(getStringValue(servingNode, "measurement_description"), getStringValue(servingNode, "metric_serving_unit"));
        if (numberOfUnits > 0 && measurementDescription != null && !measurementDescription.isBlank()) {
            return new ServingInfo(round(numberOfUnits), measurementDescription.trim());
        }

        double metricAmount = getDoubleValue(servingNode, "metric_serving_amount");
        String metricUnit = getStringValue(servingNode, "metric_serving_unit");
        if (metricAmount > 0 && metricUnit != null && !metricUnit.isBlank()) {
            return new ServingInfo(round(metricAmount), metricUnit.trim());
        }

        String servingDescription = getStringValue(servingNode, "serving_description");
        if (servingDescription != null && !servingDescription.isBlank()) {
            return parseServingLabel(servingDescription);
        }

        return new ServingInfo(fallback.servingQty(), fallback.servingUnit());
    }

    private String extractFatSecretSummaryServing(String description) {
        Matcher matcher = FATSECRET_SUMMARY_SERVING_PATTERN.matcher(description == null ? "" : description);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "1 serving";
    }

    private double extractFatSecretSummaryMetric(Pattern pattern, String description) {
        Matcher matcher = pattern.matcher(description == null ? "" : description);
        if (matcher.find()) {
            return parseDoubleValue(matcher.group(1));
        }
        return 0d;
    }

    private String canonicalizeFatSecretQuery(String query) {
        Set<String> words = toWordSet(query);
        if (words.contains("canes") || containsAllTerms(query, "raising", "canes")) {
            return rewriteBrandSearch(query, List.of("raising", "canes"), "raising canes");
        }
        if (words.contains("cfa") || words.contains("chickfila") || containsAllTerms(query, "chick", "fil")) {
            return rewriteBrandSearch(query, List.of("cfa", "chick", "fil", "chickfila"), "chick fil a");
        }
        if (query.contains("mcdonald")) {
            return rewriteBrandSearch(query, List.of("mcdonalds"), "mcdonalds");
        }
        if (query.contains("arbys")) {
            return rewriteBrandSearch(query, List.of("arbys"), "arbys");
        }
        if (query.contains("wendys")) {
            return rewriteBrandSearch(query, List.of("wendys"), "wendys");
        }
        if (containsAllTerms(query, "liquid", "iv") || query.contains("liquidiv")) {
            return rewriteBrandSearch(query, List.of("liquid", "iv", "liquidiv"), "liquid iv");
        }
        return query;
    }

    private String rewriteBrandSearch(String query, List<String> aliasTokens, String canonicalBrand) {
        Set<String> aliasSet = new HashSet<>(aliasTokens);
        Set<String> canonicalTokens = toWordSet(canonicalBrand);
        LinkedHashSet<String> remainingTokens = new LinkedHashSet<>();
        for (String token : tokenize(query)) {
            if (!aliasSet.contains(token) && !canonicalTokens.contains(token)) {
                remainingTokens.add(token);
            }
        }
        StringBuilder builder = new StringBuilder(canonicalBrand);
        for (String token : remainingTokens) {
            builder.append(' ').append(token);
        }
        return builder.toString().trim();
    }

    private boolean hasFatSecretCredentials() {
        return !fatSecretClientId.isBlank() && !fatSecretClientSecret.isBlank();
    }

    private Map<String, Object> requestFatSecret(Map<String, String> params) throws Exception {
        String accessToken = getFatSecretAccessToken();
        if (accessToken == null || accessToken.isBlank()) {
            return Collections.emptyMap();
        }
        return requestFatSecret(params, accessToken, true);
    }

    private Map<String, Object> requestFatSecret(Map<String, String> params, String accessToken, boolean retryOnUnauthorized) throws Exception {
        String queryString = params.entrySet().stream()
                .map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8) + "=" + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                .reduce((left, right) -> left + "&" + right)
                .orElse("");

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(fatSecretBaseUrl + "?" + queryString))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 401 && retryOnUnauthorized) {
            fatSecretToken = null;
            String refreshedToken = getFatSecretAccessToken();
            if (refreshedToken == null || refreshedToken.isBlank()) {
                return Collections.emptyMap();
            }
            return requestFatSecret(params, refreshedToken, false);
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("FatSecret request failed with status " + response.statusCode());
        }
        String responseBody = response.body();
        if (responseBody == null || responseBody.isBlank()) {
            return Collections.emptyMap();
        }
        Map<String, Object> payload = objectMapper.readValue(responseBody, new TypeReference<>() {});
        Object errorNode = payload.get("error");
        if (errorNode instanceof Map<?, ?> errorMap) {
            Object errorCodeValue = errorMap.get("code");
            Object errorMessageValue = errorMap.get("message");
            String errorCode = errorCodeValue == null ? "" : String.valueOf(errorCodeValue);
            String errorMessage = errorMessageValue == null ? "" : String.valueOf(errorMessageValue);
            log.warn("FatSecret returned API error {} for method '{}': {}", errorCode, params.getOrDefault("method", ""), errorMessage);
            return Collections.emptyMap();
        }
        return payload;
    }

    private String getFatSecretAccessToken() throws Exception {
        if (!hasFatSecretCredentials()) {
            return null;
        }

        long now = System.currentTimeMillis();
        FatSecretToken currentToken = fatSecretToken;
        if (currentToken != null && currentToken.isValid(now)) {
            return currentToken.accessToken();
        }

        synchronized (fatSecretTokenLock) {
            currentToken = fatSecretToken;
            if (currentToken != null && currentToken.isValid(now)) {
                return currentToken.accessToken();
            }

            String credentials = fatSecretClientId + ":" + fatSecretClientSecret;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fatSecretTokenUrl))
                    .header("Authorization", "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8)))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials&scope=basic"))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("FatSecret token request failed with status " + response.statusCode());
            }

            Map<String, Object> payload = objectMapper.readValue(response.body(), new TypeReference<>() {});
            String accessToken = getStringValue(payload, "access_token");
            long expiresAt = now + ((long) Math.max(parseDoubleValue(payload.get("expires_in")), 3600d) * 1000L);
            fatSecretToken = new FatSecretToken(accessToken, expiresAt);
            return accessToken;
        }
    }

    private List<Map<String, Object>> fetchRankedFoods(String query) {
        return fetchRankedFoods(query, true);
    }

    private List<Map<String, Object>> fetchRankedFoods(String query, boolean allowRestaurantFallback) {
        List<SearchRequest> searchRequests = buildSearchRequests(query);
        List<Map<String, Object>> foods = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();
        String scoringQuery = resolveScoringQuery(query);

        for (SearchRequest request : searchRequests) {
            for (Map<String, Object> food : requestFoods(request)) {
                if (seenKeys.add(foodKey(food))) {
                    foods.add(food);
                }
            }
        }

        foods.sort(Comparator.comparingDouble((Map<String, Object> food) -> scoreFood(food, scoringQuery)).reversed());
        double minimumScore = !allowRestaurantFallback && isPreparedFoodSearch(scoringQuery)
                ? 8d
                : containsRestaurantHint(scoringQuery) && tokenize(scoringQuery).size() > 1
                ? 45d
                : isPreparedFoodSearch(scoringQuery)
                ? 20d
                : 0d;
        List<Map<String, Object>> rankedFoods = foods.stream()
                .filter(food -> scoreFood(food, scoringQuery) >= minimumScore)
                .toList();

        if (!rankedFoods.isEmpty() || !allowRestaurantFallback) {
            return rankedFoods;
        }

        String fallbackQuery = buildRestaurantFallbackQuery(query);
        if (fallbackQuery == null || fallbackQuery.isBlank() || fallbackQuery.equals(query)) {
            return rankedFoods;
        }

        log.debug("No direct USDA restaurant matches for '{}' ; retrying with fallback query '{}'", query, fallbackQuery);
        return fetchRankedFoods(fallbackQuery, false);
    }

    private List<SearchRequest> buildSearchRequests(String query) {
        boolean preparedFoodSearch = isPreparedFoodSearch(query);
        List<String> primaryDataTypes = preparedFoodSearch ? PREPARED_FOOD_DATA_TYPES : GENERAL_FOOD_DATA_TYPES;
        List<SearchRequest> requests = new ArrayList<>();

        addSearchRequest(requests, query, true, primaryDataTypes);
        addSearchRequest(requests, query, false, primaryDataTypes);

        String compact = query.replaceAll("[^a-z0-9 ]+", " ").replaceAll("\\s+", " ").trim();
        addSearchRequest(requests, compact, true, primaryDataTypes);
        addSearchRequest(requests, compact, false, primaryDataTypes);

        List<String> tokens = tokenize(query);
        if (tokens.size() > 1) {
            addSearchRequest(requests, String.join(" ", tokens.subList(0, Math.min(tokens.size(), 3))), false, primaryDataTypes);
            addSearchRequest(requests, String.join(" ", tokens.subList(Math.max(0, tokens.size() - 2), tokens.size())), false, primaryDataTypes);
            addSearchRequest(requests, String.join("", tokens), false, primaryDataTypes);
        }

        if (preparedFoodSearch) {
            addSearchRequest(requests, query, false, GENERAL_FOOD_DATA_TYPES);
        }

        for (String brandedQuery : buildBrandedFallbackQueries(query)) {
            addSearchRequest(requests, brandedQuery, true, primaryDataTypes);
            addSearchRequest(requests, brandedQuery, false, primaryDataTypes);
            addSearchRequest(requests, brandedQuery, false, GENERAL_FOOD_DATA_TYPES);
        }

        String restaurantFallbackQuery = buildRestaurantFallbackQuery(query);
        if (restaurantFallbackQuery != null && !restaurantFallbackQuery.isBlank() && !restaurantFallbackQuery.equals(query)) {
            addSearchRequest(requests, restaurantFallbackQuery, false, PREPARED_FOOD_DATA_TYPES);
            addSearchRequest(requests, "fast food " + restaurantFallbackQuery, false, PREPARED_FOOD_DATA_TYPES);
            addSearchRequest(requests, "restaurant " + restaurantFallbackQuery, false, PREPARED_FOOD_DATA_TYPES);
        }

        for (String categoryQuery : buildRestaurantCategoryQueries(query)) {
            addSearchRequest(requests, categoryQuery, false, PREPARED_FOOD_DATA_TYPES);
        }

        return requests;
    }

    private String resolveScoringQuery(String query) {
        if (!containsRestaurantHint(query)) {
            return query;
        }

        String fallbackQuery = buildRestaurantFallbackQuery(query);
        return (fallbackQuery == null || fallbackQuery.isBlank()) ? query : fallbackQuery;
    }

    private void addSearchRequest(List<SearchRequest> requests, String query, boolean requireAllWords, List<String> dataTypes) {
        String normalized = normalizeSearchQuery(query);
        if (normalized.isBlank()) {
            return;
        }

        SearchRequest request = new SearchRequest(normalized, requireAllWords, dataTypes);
        if (!requests.contains(request)) {
            requests.add(request);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> requestFoods(SearchRequest request) {
        try {
            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "query", request.query(),
                    "pageSize", USDA_SEARCH_WINDOW_SIZE,
                    "pageNumber", 1,
                    "requireAllWords", request.requireAllWords(),
                    "dataType", request.dataTypes()
            ));

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/foods/search?api_key=" + URLEncoder.encode(apiKey, StandardCharsets.UTF_8)))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (httpResponse.statusCode() < 200 || httpResponse.statusCode() >= 300) {
                log.error("FoodData Central search failed with status {} for query '{}'", httpResponse.statusCode(), request.query());
                return Collections.emptyList();
            }

            String responseBody = httpResponse.body();
            if (responseBody == null || responseBody.isBlank()) {
                return Collections.emptyList();
            }

            Map<String, Object> response = objectMapper.readValue(responseBody, new TypeReference<>() {});
            Object foodsObj = response.get("foods");
            if (!(foodsObj instanceof List<?> foodList)) {
                return Collections.emptyList();
            }

            return foodList.stream()
                    .filter(Map.class::isInstance)
                    .map(food -> (Map<String, Object>) food)
                    .toList();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.error("FoodData Central search interrupted for query '{}'", request.query(), exception);
            return Collections.emptyList();
        } catch (Exception exception) {
            log.error("FoodData Central search request failed for query '{}'", request.query(), exception);
            return Collections.emptyList();
        }
    }

    private FoodSearchPageDto emptyPage(int page) {
        return new FoodSearchPageDto(Math.max(page, 1), 1, 0, Collections.emptyList());
    }

    private FoodSearchPageDto buildCuratedRestaurantFallbackPage(String query, int page, int size) {
        if (!containsRestaurantHint(query)) {
            return emptyPage(page);
        }

        List<FoodSearchResultDto> curatedFoods = curatedFoodsForQuery(query);
        if (curatedFoods.isEmpty()) {
            return emptyPage(page);
        }

        int totalHits = curatedFoods.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalHits / size));
        int currentPage = Math.min(Math.max(page, 1), totalPages);
        int fromIndex = Math.min((currentPage - 1) * size, totalHits);
        int toIndex = Math.min(fromIndex + size, totalHits);

        return new FoodSearchPageDto(currentPage, totalPages, totalHits, curatedFoods.subList(fromIndex, toIndex));
    }

    private List<FoodSearchResultDto> curatedFoodsForQuery(String query) {
        Set<String> words = toWordSet(query);
        if (words.contains("cfa") || words.contains("chickfila") || containsAllTerms(query, "chick", "fil")) {
            return curatedChickFilAFoods();
        }

        if (query.contains("chipotle")) {
            return curatedChipotleFoods();
        }

        return Collections.emptyList();
    }

    private List<FoodSearchResultDto> curatedChickFilAFoods() {
        return List.of(
                fallbackFood("Chick-n-Strips (3 ct)", "Chick-fil-A", 1d, "order", 310d, 28d, 16d, 14d, 1d, 1d, 0d, 970d, 70d, 2.5d, 280d),
                fallbackFood("Chicken Sandwich", "Chick-fil-A", 1d, "sandwich", 420d, 29d, 41d, 18d, 2d, 6d, 5d, 1460d, 65d, 4d, 430d),
                fallbackFood("Waffle Potato Fries (Medium)", "Chick-fil-A", 1d, "serving", 420d, 5d, 45d, 24d, 5d, 1d, 0d, 240d, 0d, 3.5d, 650d)
        );
    }

    private List<FoodSearchResultDto> curatedChipotleFoods() {
        return List.of(
                fallbackFood("Chicken Burrito Bowl", "Chipotle", 1d, "bowl", 540d, 36d, 47d, 22d, 8d, 4d, 0d, 1250d, 95d, 8d, 980d),
                fallbackFood("Chicken Burrito", "Chipotle", 1d, "burrito", 680d, 38d, 72d, 24d, 9d, 4d, 0d, 1450d, 100d, 8.5d, 1050d),
                fallbackFood("Chips & Guacamole", "Chipotle", 1d, "order", 770d, 10d, 72d, 49d, 10d, 2d, 0d, 610d, 0d, 7d, 930d)
        );
    }

    private FoodSearchResultDto fallbackFood(String foodName,
                                             String brandName,
                                             double servingQty,
                                             String servingUnit,
                                             double calories,
                                             double proteinG,
                                             double carbsG,
                                             double fatG,
                                             double fiberG,
                                             double sugarG,
                                             double addedSugarG,
                                             double sodiumMg,
                                             double cholesterolMg,
                                             double saturatedFatG,
                                             double potassiumMg) {
        return normalizeFoodSearchResult(new FoodSearchResultDto(
                foodName,
                brandName,
                servingQty,
                servingUnit,
                calories,
                proteinG,
                carbsG,
                fatG,
                fiberG,
                sugarG,
                addedSugarG,
                sodiumMg,
                cholesterolMg,
                saturatedFatG,
                potassiumMg,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                0d,
                null
            ));
    }

    private double scoreFood(Map<String, Object> food, String query) {
        String description = normalize(getStringValue(food, "description"));
        String brand = normalize(firstNonBlank(getStringValue(food, "brandName"), getStringValue(food, "brandOwner")));
        String dataType = normalize(getStringValue(food, "dataType"));
        String text = (description + " " + brand + " " + dataType).trim();
        List<String> queryTokens = tokenize(query);
        Set<String> descriptionWords = toWordSet(description);
        Set<String> brandWords = toWordSet(brand);
        boolean preparedFoodSearch = isPreparedFoodSearch(query);
        boolean simpleWholeFoodQuery = isSimpleWholeFoodQuery(queryTokens, query);
        boolean zeroSugarIntent = hasZeroSugarIntent(queryTokens, query);
        boolean preparedFoodResult = isPreparedFoodResult(description, brand, dataType);
        double score = Math.min(getDoubleValue(food, "score"), 500d) / 10d;

        if (text.equals(query)) score += 220;
        if (description.equals(query) || brand.equals(query)) score += 180;
        if (description.contains(query)) score += 120;
        if (!brand.isBlank() && brand.contains(query)) score += 105;
        if (text.contains(query)) score += 60;

        boolean brandFocusedQuery = queryTokens.stream().anyMatch(BRANDED_FOOD_HINTS::contains);
        if (!queryTokens.isEmpty()) {
            boolean allInBrand = queryTokens.stream().allMatch(brandWords::contains);
            boolean allInDescription = queryTokens.stream().allMatch(descriptionWords::contains);
            if (allInBrand) {
                score += 150;
            } else if (allInDescription) {
                score += 92;
            }
        }

        int exactDescriptionMatches = 0;
        int exactBrandMatches = 0;
        int fuzzyMatches = 0;

        for (String token : queryTokens) {
            if (brandWords.contains(token)) {
                exactBrandMatches++;
                score += 34;
            } else if (descriptionWords.contains(token)) {
                exactDescriptionMatches++;
                score += 24;
            } else if (text.contains(token)) {
                fuzzyMatches++;
                score += 8;
            } else {
                score -= preparedFoodSearch ? 6 : 2;
            }
        }

        int exactMatches = exactDescriptionMatches + exactBrandMatches;
        if (!queryTokens.isEmpty() && exactMatches == queryTokens.size()) score += 70;
        if (queryTokens.size() > 1 && exactMatches >= Math.max(2, Math.min(queryTokens.size(), 3))) score += 28;
        if (exactBrandMatches > 0 && exactDescriptionMatches > 0) score += 18;
        if (exactBrandMatches > 0 && containsRestaurantHint(query)) score += 16;
        if (brandFocusedQuery && exactBrandMatches > 0) score += 42;
        if (brandFocusedQuery && exactBrandMatches == 0 && exactDescriptionMatches > 0 && !brand.isBlank()) score += 16;
        if (fuzzyMatches > 0) score += Math.min(fuzzyMatches * 2.5d, 8d);
        if (brandFocusedQuery && exactMatches == 0 && fuzzyMatches == 0) score -= 75;
        if (containsRestaurantHint(query) && queryTokens.size() > 1 && exactMatches == 0 && fuzzyMatches == 0) score -= 42;
        if (containsRestaurantHint(query) && !brand.isBlank() && exactBrandMatches == 0) {
            score -= containsAny(description, "fast foods", "fast food", "restaurant", "family style") ? 10 : 26;
        }
        if (containsRestaurantHint(query) && brand.isBlank()
                && containsAny(description, "fast foods", "fast food", "restaurant", "family style")) {
            score += 10;
        }

        int restaurantFallbackMatches = 0;
        String restaurantFallbackQuery = containsRestaurantHint(query) ? buildRestaurantFallbackQuery(query) : null;
        if (restaurantFallbackQuery != null && !restaurantFallbackQuery.isBlank()) {
            for (String token : tokenize(restaurantFallbackQuery)) {
                if (RESTAURANT_HINTS.contains(token) || "fast".equals(token) || "food".equals(token)) {
                    continue;
                }
                if (descriptionWords.contains(token) || brandWords.contains(token) || text.contains(token)) {
                    restaurantFallbackMatches++;
                }
            }
        }
        if (containsRestaurantHint(query) && restaurantFallbackMatches >= 2) score += 52;
        else if (containsRestaurantHint(query) && restaurantFallbackMatches == 1) score += 14;
        if (containsRestaurantHint(query) && exactBrandMatches == 0 && restaurantFallbackMatches == 0) score -= 160;

        if (!brand.isBlank()) score += 12;
        if (dataType.contains("sr legacy")) score += 26;
        if (dataType.contains("survey")) score += 22;
        if (dataType.contains("branded")) score += 20;
        if (dataType.contains("foundation") && preparedFoodSearch) score -= 24;

        if (preparedFoodSearch) {
            if (preparedFoodResult) score += 34;
            else score -= 30;
            if (containsAny(description, "fast foods", "fast food", "restaurant", "family style")) score += 26;
            if (containsAny(description, "raw", "uncooked")) score -= 85;
            if (containsAny(description, "syrup", "beverage", "drink", "flour", "sweetener")) score -= 46;
        }

        if (containsAny(query, "chicken", "finger", "fingers", "strip", "strips", "nugget", "nuggets", "tender", "tenders")) {
            if (containsAny(description, "chicken", "finger", "fingers", "strip", "strips", "nugget", "nuggets", "tender", "tenders")) score += 26;
            else score -= 44;
        }
        if (containsAny(query, "burger", "sandwich", "burrito", "taco", "wrap", "toast", "salad", "coleslaw")) {
            if (containsAny(description, "burger", "sandwich", "burrito", "taco", "wrap", "toast", "salad", "coleslaw")) score += 18;
        }
        if (containsAny(query, "combo", "meal", "box") && !containsAny(description, "combo", "meal", "box", "sandwich", "burger", "burrito", "taco", "wrap", "platter", "salad")) {
            score -= 18;
        }

        if (containsAny(description, "farm raised") && !containsAny(query, "farm", "raised")) score -= 28;
        if (containsAny(description, "without skin") && !containsAny(query, "skin")) score -= 12;
        if (findNutrientAmount(food, "KCAL", "1008", "208", "Energy") == 0) score -= 8;
        if (exactMatches == 0 && queryTokens.size() > 1) score -= preparedFoodSearch ? 45 : 20;
        if (exactMatches == 1 && queryTokens.size() > 2) score -= preparedFoodSearch ? 18 : 8;

        if (simpleWholeFoodQuery) {
            double sodiumMg = findNutrientAmount(food, "MG", "1093", "307", "Sodium, Na");
            if (queryTokens.size() == 1) {
                String token = queryTokens.get(0);
                if (isPrimaryFoodTokenMatch(description, token)) {
                    score += 88;
                } else if (descriptionWords.contains(token)) {
                    score -= 34;
                }
                if (containsAny(description, PREPARED_FOOD_TERMS.toArray(new String[0]))) {
                    score -= 68;
                }
            }
            if (queryTokens.stream().allMatch(descriptionWords::contains)) score += 56;
            if (!brand.isBlank()) score -= 180;
            if (dataType.contains("branded")) score -= 120;
            if (dataType.contains("foundation")) score += 62;
            if (dataType.contains("sr legacy")) score += 34;
            if (dataType.contains("survey")) score += 18;
            if (containsAny(description, NATURAL_FORM_TERMS.toArray(new String[0]))) score += 26;
            if (containsAny(description, PROCESSED_FORM_TERMS.toArray(new String[0]))) score -= 130;
            if (containsAny(description, RECIPE_LIKE_TERMS.toArray(new String[0]))) score -= 135;
            if (sodiumMg > 250d) score -= 80;
            if (!brand.isBlank() && sodiumMg > 180d && isTinyServingSize(food)) score -= 220;
            if (findNutrientAmount(food, "G", "1235", "539", "Sugars, added") > 1d) score -= 80;
            if (findNutrientAmount(food, "KCAL", "1008", "208", "Energy") > 220d) score -= 95;
        }

        if (zeroSugarIntent) {
            if (!containsAny(text, "zero", "0 sugar", "zero sugar", "sugar free", "sugar-free")) {
                score -= 110;
            }
            if (findNutrientAmount(food, "G", "1235", "539", "Sugars, added") > 0.5d) score -= 95;
            if (findNutrientAmount(food, "G", "1005", "205", "Carbohydrate") > 8d) score -= 55;
        }

        return score;
    }

    private double scoreSearchText(String foodName,
                                   String brandName,
                                   String context,
                                   String query,
                                   boolean brandedSource,
                                   int position) {
        String normalizedFoodName = normalize(foodName);
        String normalizedBrand = normalize(brandName);
        String normalizedContext = normalize(context);
        String combined = (normalizedFoodName + " " + normalizedBrand + " " + normalizedContext).trim();
        List<String> queryTokens = tokenize(query);
        Set<String> foodWords = toWordSet(normalizedFoodName);
        Set<String> brandWords = toWordSet(normalizedBrand);
        boolean simpleWholeFoodQuery = isSimpleWholeFoodQuery(queryTokens, query);
        boolean zeroSugarIntent = hasZeroSugarIntent(queryTokens, query);
        boolean restaurantLikeQuery = containsRestaurantHint(query);
        boolean preparedFoodSearch = isPreparedFoodSearch(query);
        double score = Math.max(0d, 42d - (position * 2.5d));

        if (normalizedFoodName.equals(query) || normalizedBrand.equals(query)) score += 210d;
        if (combined.equals(query)) score += 180d;
        if (normalizedFoodName.contains(query)) score += 100d;
        if (!normalizedBrand.isBlank() && normalizedBrand.contains(query)) score += 130d;
        if (combined.contains(query)) score += 48d;

        boolean brandFocusedQuery = queryTokens.stream().anyMatch(BRANDED_FOOD_HINTS::contains);
        if (!queryTokens.isEmpty()) {
            boolean allInBrand = queryTokens.stream().allMatch(brandWords::contains);
            boolean allInFood = queryTokens.stream().allMatch(foodWords::contains);
            if (allInBrand) {
                score += brandedSource ? 160d : 120d;
            } else if (allInFood) {
                score += 90d;
            }
        }

        int exactFoodMatches = 0;
        int exactBrandMatches = 0;
        int fuzzyMatches = 0;
        for (String token : queryTokens) {
            if (brandWords.contains(token)) {
                exactBrandMatches++;
                score += 40d;
            } else if (foodWords.contains(token)) {
                exactFoodMatches++;
                score += 30d;
            } else if (combined.contains(token)) {
                fuzzyMatches++;
                score += 12d;
            } else {
                score -= restaurantLikeQuery ? 9d : 4d;
            }
        }

        int exactMatches = exactFoodMatches + exactBrandMatches;
        if (!queryTokens.isEmpty() && exactMatches == queryTokens.size()) score += 85d;
        if (queryTokens.size() > 1 && exactMatches >= Math.max(2, Math.min(queryTokens.size(), 3))) score += 28d;
        if (exactBrandMatches > 0 && exactFoodMatches > 0) score += 24d;
        if (fuzzyMatches > 0) score += Math.min(fuzzyMatches * 3d, 9d);
        if (brandedSource && !normalizedBrand.isBlank()) score += 18d;
        if (brandFocusedQuery && exactBrandMatches > 0) score += 40d;
        if (brandFocusedQuery && exactBrandMatches == 0 && exactFoodMatches > 0 && !normalizedBrand.isBlank()) score += 18d;

        if (restaurantLikeQuery) {
            if (exactBrandMatches > 0) score += 72d;
            if (normalizedBrand.isBlank()) score -= 36d;
            if (exactBrandMatches == 0 && exactFoodMatches == 0 && fuzzyMatches == 0) score -= 80d;
            if (containsAny(normalizedFoodName + " " + normalizedContext, "combo", "fries", "sandwich", "nuggets", "tenders", "toast", "bowl", "burrito")) {
                score += 22d;
            }
        }

        if (preparedFoodSearch && containsAny(normalizedFoodName + " " + normalizedContext, "raw", "uncooked", "farm raised", "syrup")) {
            score -= 48d;
        }

        if (simpleWholeFoodQuery) {
            if (queryTokens.size() == 1) {
                String token = queryTokens.get(0);
                if (isPrimaryFoodTokenMatch(normalizedFoodName, token)) {
                    score += 74d;
                } else if (foodWords.contains(token)) {
                    score -= 28d;
                }
                if (containsAny(normalizedFoodName + " " + normalizedContext, PREPARED_FOOD_TERMS.toArray(new String[0]))) {
                    score -= 56d;
                }
            }
            if (queryTokens.stream().allMatch(foodWords::contains)) score += 56d;
            if (!normalizedBrand.isBlank()) score -= 140d;
            if (containsAny(normalizedContext, "branded")) score -= 42d;
            if (containsAny(normalizedFoodName + " " + normalizedContext, NATURAL_FORM_TERMS.toArray(new String[0]))) score += 20d;
            if (containsAny(normalizedFoodName + " " + normalizedContext, PROCESSED_FORM_TERMS.toArray(new String[0]))) score -= 110d;
            if (containsAny(combined, RECIPE_LIKE_TERMS.toArray(new String[0]))) score -= 120d;
        }

        if (zeroSugarIntent) {
            if (!containsAny(combined, "zero", "0 sugar", "zero sugar", "sugar free", "sugar-free")) {
                score -= 130d;
            }
            if (containsAny(combined, "sweetened", "syrup", "nectar", "juice", "regular")) {
                score -= 75d;
            }
        }

        return score;
    }

    private boolean isPreparedFoodSearch(String query) {
        Set<String> words = toWordSet(query);
        for (String word : words) {
            if (PREPARED_FOOD_TERMS.contains(word) || RESTAURANT_HINTS.contains(word)) {
                return true;
            }
        }
        return false;
    }

    private boolean isSimpleWholeFoodQuery(List<String> queryTokens, String query) {
        if (queryTokens.isEmpty() || queryTokens.size() > 2) {
            return false;
        }
        if (queryTokens.stream().anyMatch(RESTAURANT_HINTS::contains)) {
            return false;
        }
        if (queryTokens.stream().anyMatch(BRANDED_FOOD_HINTS::contains)) {
            return false;
        }
        if (queryTokens.stream().anyMatch(PREPARED_FOOD_TERMS::contains)) {
            return false;
        }
        if (queryTokens.stream().anyMatch(token -> token.length() <= 1)) {
            return false;
        }
        return !containsAny(normalize(query), RECIPE_LIKE_TERMS.toArray(new String[0]));
    }

    private boolean hasZeroSugarIntent(List<String> queryTokens, String query) {
        String normalized = normalize(query);
        return queryTokens.contains("zero")
                || queryTokens.contains("sugarfree")
                || normalized.contains("sugar free")
                || normalized.contains("sugar-free")
                || normalized.contains("0 sugar");
    }

    private boolean isPrimaryFoodTokenMatch(String normalizedText, String token) {
        if (normalizedText == null || normalizedText.isBlank() || token == null || token.isBlank()) {
            return false;
        }
        List<String> tokens = tokenize(normalizedText);
        if (tokens.isEmpty()) {
            return false;
        }
        String head = tokens.get(0);
        return head.equals(token)
                || head.equals(token + "s")
                || head.equals(token + "es");
    }

    private boolean isPreparedFoodResult(String description, String brand, String dataType) {
        Set<String> words = new HashSet<>(toWordSet(description));
        words.addAll(toWordSet(brand));
        for (String word : words) {
            if (PREPARED_FOOD_TERMS.contains(word)) {
                return true;
            }
        }
        return dataType.contains("survey") || dataType.contains("sr legacy");
    }

    private boolean containsRestaurantHint(String query) {
        Set<String> words = toWordSet(query);
        for (String word : words) {
            if (RESTAURANT_HINTS.contains(word)) {
                return true;
            }
        }
        return false;
    }

    private String buildRestaurantFallbackQuery(String query) {
        if (!containsRestaurantHint(query)) {
            return null;
        }

        Set<String> words = toWordSet(query);
        LinkedHashSet<String> fallbackTokens = new LinkedHashSet<>();
        for (String token : tokenize(query)) {
            if (!RESTAURANT_HINTS.contains(token) && !"food".equals(token) && !"restaurant".equals(token)) {
                fallbackTokens.add(token);
            }
        }

        if (words.contains("canes") || containsAllTerms(query, "raising", "canes")) {
            addFallbackTokens(fallbackTokens, "chicken", "fingers", "tenders", "fries", "toast", "combo");
        } else if (words.contains("cfa") || words.contains("chickfila") || containsAllTerms(query, "chick", "fil")) {
            addFallbackTokens(fallbackTokens, "chicken", "sandwich", "nuggets", "tenders", "wrap", "salad", "fries", "breakfast");
        } else if (query.contains("mcdonald")) {
            addFallbackTokens(fallbackTokens, "burger", "nuggets", "combo");
        } else if (query.contains("popeyes")) {
            addFallbackTokens(fallbackTokens, "fried", "chicken", "tenders", "biscuit");
        } else if (query.contains("chipotle")) {
            addFallbackTokens(fallbackTokens, "bowl", "burrito", "rice", "beans", "chicken");
        } else if (query.contains("wendy")) {
            addFallbackTokens(fallbackTokens, "burger", "chicken", "combo");
        } else if (query.contains("kfc")) {
            addFallbackTokens(fallbackTokens, "fried", "chicken", "tenders", "biscuit");
        } else if (query.contains("subway")) {
            addFallbackTokens(fallbackTokens, "sub", "sandwich", "wrap", "salad");
        } else if (query.contains("taco")) {
            addFallbackTokens(fallbackTokens, "taco", "burrito", "quesadilla", "nachos");
        } else {
            addFallbackTokens(fallbackTokens, "chicken", "sandwich", "combo");
        }

        addFallbackTokens(fallbackTokens, "fast", "food");
        return fallbackTokens.isEmpty() ? null : String.join(" ", fallbackTokens);
    }

    private List<Map<String, Object>> prioritizeRestaurantVariety(List<Map<String, Object>> foods, String query) {
        if (!shouldDiversifyRestaurantResults(query) || foods.size() < 3) {
            return foods;
        }

        List<Map<String, Object>> prioritized = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();
        for (String category : preferredRestaurantCategories(query)) {
            Map<String, Object> match = findBestRestaurantCategoryMatch(foods, category, query, seenKeys);
            if (match != null) {
                prioritized.add(match);
                seenKeys.add(foodKey(match));
            }
        }

        for (Map<String, Object> food : foods) {
            if (seenKeys.add(foodKey(food))) {
                prioritized.add(food);
            }
        }

        return prioritized;
    }

    private boolean shouldDiversifyRestaurantResults(String query) {
        if (!containsRestaurantHint(query)) {
            return false;
        }

        return !containsAny(query,
                "sandwich", "nuggets", "tender", "tenders", "finger", "fingers", "strip", "strips",
                "wrap", "salad", "fries", "toast", "coleslaw", "burger", "burrito", "taco", "bowl");
    }

    private List<String> preferredRestaurantCategories(String query) {
        Set<String> words = toWordSet(query);
        if (words.contains("canes") || containsAllTerms(query, "raising", "canes")) {
            return List.of("tenders", "fries", "toast", "combo", "sandwich");
        }
        if (words.contains("cfa") || words.contains("chickfila") || containsAllTerms(query, "chick", "fil")) {
            return List.of("sandwich", "nuggets", "tenders", "wrap", "salad", "fries", "breakfast");
        }
        if (query.contains("chipotle")) {
            return List.of("bowl", "burrito", "salad", "taco");
        }
        if (query.contains("mcdonald")) {
            return List.of("burger", "nuggets", "fries", "breakfast", "sandwich");
        }
        return List.of("sandwich", "nuggets", "tenders", "wrap", "salad", "fries");
    }

    private Map<String, Object> findBestRestaurantCategoryMatch(List<Map<String, Object>> foods,
                                                                 String category,
                                                                 String query,
                                                                 Set<String> seenKeys) {
        Map<String, Object> bestMatch = null;
        double bestScore = Double.NEGATIVE_INFINITY;

        for (Map<String, Object> food : foods) {
            String key = foodKey(food);
            if (seenKeys.contains(key) || !category.equals(inferRestaurantCategory(food))) {
                continue;
            }

            double candidateScore = restaurantCategoryMatchScore(food, query);
            if (bestMatch == null || candidateScore > bestScore) {
                bestMatch = food;
                bestScore = candidateScore;
            }
        }

        return bestMatch;
    }

    private double restaurantCategoryMatchScore(Map<String, Object> food, String query) {
        String description = normalize(getStringValue(food, "description"));
        String brand = normalize(firstNonBlank(getStringValue(food, "brandName"), getStringValue(food, "brandOwner")));
        double score = Math.min(getDoubleValue(food, "score"), 500d) / 20d;

        if (brand.isBlank()) {
            score += 18d;
        }
        if (containsAny(description, "fast foods", "fast food", "restaurant", "family style")) {
            score += 20d;
        }
        if (!brand.isBlank() && !restaurantBrandMatchesQuery(brand, query)) {
            score -= 16d;
        }

        return score;
    }

    private boolean restaurantBrandMatchesQuery(String brand, String query) {
        Set<String> brandWords = toWordSet(brand);
        if (brandWords.isEmpty()) {
            return false;
        }

        for (String token : toWordSet(canonicalizeFatSecretQuery(query))) {
            if (brandWords.contains(token)) {
                return true;
            }
        }

        return false;
    }

    private String inferRestaurantCategory(Map<String, Object> food) {
        String text = normalize(firstNonBlank(getStringValue(food, "description"), "") + " "
                + firstNonBlank(getStringValue(food, "brandName"), getStringValue(food, "brandOwner"), ""));
        if (containsAny(text, "tender", "tenders", "finger", "fingers", "strip", "strips")) {
            return "tenders";
        }
        if (containsAny(text, "nugget", "nuggets")) {
            return "nuggets";
        }
        if (containsAny(text, "french toast")) {
            return "breakfast";
        }
        if (containsAny(text, "texas toast", "toast")) {
            return "toast";
        }
        if (containsAny(text, "coleslaw", "cole slaw", "slaw")) {
            return "coleslaw";
        }
        if (containsAny(text, "fries", "french fries", "waffle fries")) {
            return "fries";
        }
        if (containsAny(text, "oatmeal")) {
            return "breakfast";
        }
        if (containsAny(text, "biscuit", "egg", "breakfast", "hash brown", "hashbrown")) {
            return "breakfast";
        }
        if (containsAny(text, "wrap")) {
            return "wrap";
        }
        if (containsAny(text, "salad")) {
            return "salad";
        }
        if (containsAny(text, "burrito")) {
            return "burrito";
        }
        if (containsAny(text, "bowl")) {
            return "bowl";
        }
        if (containsAny(text, "taco")) {
            return "taco";
        }
        if (containsAny(text, "burger")) {
            return "burger";
        }
        if (containsAny(text, "combo", "box", "platter")) {
            return "combo";
        }
        if (containsAny(text, "sandwich", "fillet")) {
            return "sandwich";
        }
        return "other";
    }

    private List<String> buildRestaurantCategoryQueries(String query) {
        if (!containsRestaurantHint(query)) {
            return Collections.emptyList();
        }

        List<String> queries = new ArrayList<>();
        for (String category : preferredRestaurantCategories(query)) {
            String categoryQuery = buildRestaurantCategoryQuery(category);
            if (categoryQuery != null && !queries.contains(categoryQuery)) {
                queries.add(categoryQuery);
            }
        }
        return queries;
    }

    private List<String> buildBrandedFallbackQueries(String query) {
        Set<String> words = toWordSet(query);
        List<String> fallbacks = new ArrayList<>();

        if ((words.contains("liquid") && words.contains("iv")) || query.contains("liquidiv")) {
            fallbacks.add("liquid iv hydration multiplier");
            fallbacks.add("liquid i v hydration multiplier");
        }
        if (words.contains("quest")) {
            fallbacks.add("quest protein");
            fallbacks.add("quest protein bar");
        }
        if (words.contains("fairlife")) {
            fallbacks.add("fairlife protein shake");
        }
        if (words.contains("prime")) {
            fallbacks.add("prime hydration drink");
        }
        if (words.contains("gatorade")) {
            fallbacks.add("gatorade sports drink");
        }

        return fallbacks;
    }

    private String buildRestaurantCategoryQuery(String category) {
        switch (category) {
            case "sandwich":
                return "fast food chicken sandwich";
            case "nuggets":
                return "fast food chicken nuggets";
            case "tenders":
                return "fast food chicken fingers tenders";
            case "wrap":
                return "fast food chicken wrap";
            case "salad":
                return "fast food chicken salad";
            case "fries":
                return "fast food fries";
            case "toast":
                return "fast food texas toast";
            case "coleslaw":
                return "fast food cole slaw";
            case "combo":
                return "fast food chicken combo meal";
            case "breakfast":
                return "fast food breakfast sandwich";
            case "burger":
                return "fast food burger";
            case "burrito":
                return "fast food burrito";
            case "bowl":
                return "fast food bowl";
            case "taco":
                return "fast food taco";
            default:
                return null;
        }
    }
    private boolean containsAllTerms(String text, String... terms) {
        for (String term : terms) {
            if (!text.contains(term)) {
                return false;
            }
        }
        return true;
    }

    private void addFallbackTokens(LinkedHashSet<String> target, String... tokens) {
        for (String token : tokens) {
            if (token != null && !token.isBlank()) {
                target.add(token);
            }
        }
    }

    private Set<String> toWordSet(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return Collections.emptySet();
        }
        return new HashSet<>(List.of(normalized.split(" ")).stream()
                .map(String::trim)
                .filter(token -> token.length() > 1)
                .toList());
    }

    private boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (text.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private List<String> tokenize(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return Collections.emptyList();
        }
        return List.of(normalized.split(" ")).stream()
                .filter(token -> token.length() > 1)
                .distinct()
                .toList();
    }

    private String normalizeSearchQuery(String value) {
        return normalize(value);
    }

    private double sumElectrolytesMg(double sodiumMg, double potassiumMg, double magnesiumMg) {
        return round(Math.max(0d, sodiumMg) + Math.max(0d, potassiumMg) + Math.max(0d, magnesiumMg));
    }

    private String foodKey(Map<String, Object> food) {
        return normalize(getStringValue(food, "description")) + "|"
                + normalize(firstNonBlank(getStringValue(food, "brandName"), getStringValue(food, "brandOwner"))) + "|"
                + normalize(getStringValue(food, "fdcId"));
    }

    private FoodSearchResultDto mapToFoodSearchResult(Map<String, Object> food) {
        ServingInfo servingInfo = extractServingInfo(food);
        return normalizeFoodSearchResult(new FoodSearchResultDto(
                firstNonBlank(getStringValue(food, "description"), "Unknown food"),
                firstNonBlank(getStringValue(food, "brandName"), getStringValue(food, "brandOwner")),
                servingInfo.quantity(),
                servingInfo.unit(),
                findNutrientAmount(food, "KCAL", "1008", "208", "Energy"),
                findNutrientAmount(food, "G", "1003", "203", "Protein"),
                findNutrientAmount(food, "G", "1005", "205", "Carbohydrate, by difference"),
                findNutrientAmount(food, "G", "1004", "204", "Total lipid (fat)"),
                findNutrientAmount(food, "G", "1079", "291", "Fiber, total dietary"),
                findNutrientAmount(food, "G", "2000", "269", "Sugars, total including NLEA", "Total Sugars"),
                findNutrientAmount(food, "G", "1235", "539", "Sugars, added"),
                findNutrientAmount(food, "MG", "1093", "307", "Sodium, Na"),
                findNutrientAmount(food, "MG", "1253", "601", "Cholesterol"),
                findNutrientAmount(food, "G", "1258", "606", "Fatty acids, total saturated"),
                findNutrientAmount(food, "MG", "1092", "306", "Potassium, K"),
                findNutrientAmount(food, "MG", "1057", "262", "Caffeine"),
                0d,
                findNutrientAmount(food, "MCG", "1106", "320", "Vitamin A, RAE"),
                findNutrientAmount(food, "MG", "1162", "401", "Vitamin C, total ascorbic acid"),
                findNutrientAmount(food, "MCG", "1114", "328", "Vitamin D (D2 + D3)"),
                findNutrientAmount(food, "MG", "1109", "323", "Vitamin E (alpha-tocopherol)"),
                findNutrientAmount(food, "MCG", "1185", "430", "Vitamin K (phylloquinone)"),
                findNutrientAmount(food, "MG", "1165", "404", "Thiamin"),
                findNutrientAmount(food, "MG", "1166", "405", "Riboflavin"),
                findNutrientAmount(food, "MG", "1167", "406", "Niacin"),
                findNutrientAmount(food, "MG", "1175", "415", "Vitamin B-6"),
                findNutrientAmount(food, "MCG", "1178", "418", "Vitamin B-12"),
                findNutrientAmount(food, "MCG", "1191", "1177", "435", "Folate, DFE", "Folate, total"),
                findNutrientAmount(food, "MG", "1095", "309", "Zinc, Zn"),
                findNutrientAmount(food, "MG", "1087", "301", "Calcium, Ca"),
                findNutrientAmount(food, "MG", "1089", "303", "Iron, Fe"),
                findNutrientAmount(food, "MG", "1090", "304", "Magnesium, Mg"),
                null
        ));
    }

    private FoodSearchResultDto normalizeFoodSearchResult(FoodSearchResultDto result) {
        if (result == null) {
            return null;
        }

        double servingQty = result.servingQty();
        String servingUnit = normalize(result.servingUnit());

        if (servingQty <= 0d || !isGramLikeUnit(servingUnit)) {
            return result;
        }

        double macroMassG = Math.max(0d, result.proteinG())
                + Math.max(0d, result.carbsG())
                + Math.max(0d, result.fatG())
                + Math.max(0d, result.fiberG());

        double adjustedServingQty = servingQty;
        if (macroMassG > servingQty * 1.15d) {
            adjustedServingQty = round(macroMassG);
        }

        double calorieDensity = adjustedServingQty > 0d ? result.calories() / adjustedServingQty : 0d;
        if (calorieDensity > 9.2d) {
            adjustedServingQty = round(result.calories() / 9.2d);
        }

        if (Math.abs(adjustedServingQty - servingQty) < 0.01d) {
            return result;
        }

        return new FoodSearchResultDto(
                result.foodName(),
                result.brandName(),
                adjustedServingQty,
                result.servingUnit(),
                result.calories(),
                result.proteinG(),
                result.carbsG(),
                result.fatG(),
                result.fiberG(),
                result.sugarG(),
                result.addedSugarG(),
                result.sodiumMg(),
                result.cholesterolMg(),
                result.saturatedFatG(),
                result.potassiumMg(),
                result.caffeineMg(),
                result.electrolytesMg(),
                result.vitaminAMcg(),
                result.vitaminCMg(),
                result.vitaminDMcg(),
                result.vitaminEMg(),
                result.vitaminKMcg(),
                result.thiaminMg(),
                result.riboflavinMg(),
                result.niacinMg(),
                result.vitaminB6Mg(),
                result.vitaminB12Mcg(),
                result.folateMcg(),
                result.zincMg(),
                result.calciumMg(),
                result.ironMg(),
                result.magnesiumMg(),
                result.thumbnailUrl()
        );
    }

    private boolean isGramLikeUnit(String normalizedServingUnit) {
        return "g".equals(normalizedServingUnit)
                || "gram".equals(normalizedServingUnit)
                || "grams".equals(normalizedServingUnit)
                || "gm".equals(normalizedServingUnit);
    }

    private boolean isTinyServingSize(Map<String, Object> food) {
        double servingSize = getDoubleValue(food, "servingSize");
        if (servingSize <= 0d) {
            return false;
        }

        String unit = normalize(getStringValue(food, "servingSizeUnit"));
        if (isGramLikeUnit(unit)) {
            return servingSize <= 45d;
        }
        if ("ml".equals(unit) || "milliliter".equals(unit) || "milliliters".equals(unit)) {
            return servingSize <= 60d;
        }
        if ("oz".equals(unit) || "ounce".equals(unit) || "ounces".equals(unit)) {
            return servingSize <= 1.5d;
        }

        return false;
    }

    private ServingInfo extractServingInfo(Map<String, Object> food) {
        double servingSize = getDoubleValue(food, "servingSize");
        String servingSizeUnit = getStringValue(food, "servingSizeUnit");
        String householdServing = getStringValue(food, "householdServingFullText");
        if (servingSize > 0 && servingSizeUnit != null && !servingSizeUnit.isBlank()) return new ServingInfo(round(servingSize), servingSizeUnit.trim());
        if (householdServing != null && !householdServing.isBlank()) return new ServingInfo(1, householdServing.trim());
        if (servingSize > 0) return new ServingInfo(round(servingSize), "serving");
        return new ServingInfo(1, "serving");
    }

    @SuppressWarnings("unchecked")
    private double findNutrientAmount(Map<String, Object> food, String targetUnit, String... identifiers) {
        Object nutrientsObj = food.get("foodNutrients");
        if (!(nutrientsObj instanceof List<?> nutrients)) return 0;
        for (Object nutrientObj : nutrients) {
            if (!(nutrientObj instanceof Map<?, ?> rawNutrient)) continue;
            Map<String, Object> nutrient = (Map<String, Object>) rawNutrient;
            String nutrientNumber = normalize(getStringValue(nutrient, "nutrientNumber"));
            String nutrientName = normalize(getStringValue(nutrient, "nutrientName"));
            for (String identifier : identifiers) {
                String normalizedIdentifier = normalize(identifier);
                if (normalizedIdentifier.equals(nutrientNumber) || normalizedIdentifier.equals(nutrientName)) {
                    double rawValue = getDoubleValue(nutrient, "value");
                    if (rawValue == 0) rawValue = getDoubleValue(nutrient, "amount");
                    return convertUnit(rawValue, getStringValue(nutrient, "unitName"), targetUnit);
                }
            }
        }
        return 0;
    }

    private double convertUnit(double value, String sourceUnit, String targetUnit) {
        if (value == 0) return 0;
        String normalizedSource = normalizeUnit(sourceUnit);
        String normalizedTarget = normalizeUnit(targetUnit);
        if (normalizedSource.isBlank() || normalizedSource.equals(normalizedTarget)) return round(value);
        return switch (normalizedTarget) {
            case "G" -> round(convertToGrams(value, normalizedSource));
            case "MG" -> round(convertToMilligrams(value, normalizedSource));
            case "MCG" -> round(convertToMicrograms(value, normalizedSource));
            case "KCAL" -> round(convertToCalories(value, normalizedSource));
            default -> round(value);
        };
    }

    private double convertToGrams(double value, String sourceUnit) {
        return switch (sourceUnit) {
            case "MG" -> value / 1_000d;
            case "MCG" -> value / 1_000_000d;
            default -> value;
        };
    }

    private double convertToMilligrams(double value, String sourceUnit) {
        return switch (sourceUnit) {
            case "G" -> value * 1_000d;
            case "MCG" -> value / 1_000d;
            default -> value;
        };
    }

    private double convertToMicrograms(double value, String sourceUnit) {
        return switch (sourceUnit) {
            case "G" -> value * 1_000_000d;
            case "MG" -> value * 1_000d;
            case "IU" -> value / 40d;
            default -> value;
        };
    }

    private double convertToCalories(double value, String sourceUnit) {
        return "KJ".equals(sourceUnit) ? value / 4.184d : value;
    }

    private double percentToAmount(double percent, double dailyValue) {
        if (percent <= 0 || dailyValue <= 0) {
            return 0;
        }
        return round((percent / 100d) * dailyValue);
    }

    private double coalescePositive(double primary, double fallback) {
        return primary > 0 ? round(primary) : round(fallback);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return null;
    }

    private Map<String, Object> getMapNode(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (value instanceof Map<?, ?> mapValue) {
            @SuppressWarnings("unchecked")
            Map<String, Object> typedMap = (Map<String, Object>) mapValue;
            return typedMap;
        }
        return Collections.emptyMap();
    }

    private List<Map<String, Object>> getMapListNode(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (value instanceof List<?> listValue) {
            List<Map<String, Object>> maps = new ArrayList<>();
            for (Object item : listValue) {
                if (item instanceof Map<?, ?> mapItem) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> typedMap = (Map<String, Object>) mapItem;
                    maps.add(typedMap);
                }
            }
            return maps;
        }
        if (value instanceof Map<?, ?> singleMap) {
            @SuppressWarnings("unchecked")
            Map<String, Object> typedMap = (Map<String, Object>) singleMap;
            return List.of(typedMap);
        }
        return Collections.emptyList();
    }

    private boolean getBooleanish(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Boolean boolValue) {
            return boolValue;
        }
        String normalized = normalize(String.valueOf(value));
        return "1".equals(normalized) || "true".equals(normalized) || "yes".equals(normalized);
    }

    private String getStringValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? value.toString() : null;
    }

    private double getDoubleValue(Map<String, Object> map, String key) {
        return parseDoubleValue(map.get(key));
    }

    private int parsePositiveInt(Object value) {
        return Math.max((int) Math.round(parseDoubleValue(value)), 0);
    }

    private double parseDoubleValue(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value == null) {
            return 0d;
        }
        String raw = value.toString().trim();
        if (raw.isEmpty()) {
            return 0d;
        }
        String normalizedNumeric = raw.replaceAll("[^0-9.\\-]", "");
        if (normalizedNumeric.isEmpty() || "-".equals(normalizedNumeric) || ".".equals(normalizedNumeric) || "-.".equals(normalizedNumeric)) {
            return 0d;
        }
        try {
            return Double.parseDouble(normalizedNumeric);
        } catch (NumberFormatException exception) {
            return 0d;
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.US)
                .replace("_", " ")
                .replace("'", "")
                .replace("\u2019", "")
                .replaceAll("[^a-z0-9]+", " ")
                .replaceAll("\\bi\\s+v\\b", "iv")
                .trim();
    }

    private String normalizeUnit(String value) {
        return value == null ? "" : value.trim().replace("\u00B5", "u").replace("\u03BC", "u").toUpperCase(Locale.US).replace("UG", "MCG");
    }

    private double round(double value) {
        return Math.round(value * 100d) / 100d;
    }

    private ServingInfo parseServingLabel(String label) {
        String trimmed = label == null ? "" : label.trim();
        if (trimmed.isBlank()) {
            return new ServingInfo(1d, "serving");
        }
        int firstSpace = trimmed.indexOf(' ');
        if (firstSpace > 0) {
            String firstToken = trimmed.substring(0, firstSpace).trim();
            double quantity = parseDoubleValue(firstToken);
            if (quantity > 0) {
                return new ServingInfo(round(quantity), trimmed.substring(firstSpace + 1).trim());
            }
        }
        return new ServingInfo(1d, trimmed);
    }

    private record ServingInfo(double quantity, String unit) {}
    private record SearchRequest(String query, boolean requireAllWords, List<String> dataTypes) {}
    private record CachedValue<T>(T value, long expiresAt) {
        boolean isFresh(long now) {
            return value != null && expiresAt > now;
        }
    }
    private record FatSecretToken(String accessToken, long expiresAt) {
        boolean isValid(long now) {
            return accessToken != null && !accessToken.isBlank() && expiresAt - FATSECRET_TOKEN_BUFFER_MS > now;
        }
    }
    private record FatSecretSearchPage(int currentPage, int totalPages, int totalHits, List<FatSecretFoodSearchItem> items) {}
    private record FatSecretFoodSearchItem(String foodId, String foodName, String brandName, String foodType, String foodDescription, double rankingScore) {}
}
