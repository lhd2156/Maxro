package com.maxro.maxro_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient nutritionixWebClient(
            @Value("${maxro.nutritionix.base-url:https://trackapi.nutritionix.com/v2}") String baseUrl,
            @Value("${maxro.nutritionix.app-id:}") String appId,
            @Value("${maxro.nutritionix.api-key:}") String apiKey) {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("x-app-id", appId)
                .defaultHeader("x-app-key", apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
