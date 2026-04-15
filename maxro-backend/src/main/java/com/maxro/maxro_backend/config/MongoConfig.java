package com.maxro.maxro_backend.config;

import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@Configuration
@EnableMongoAuditing
public class MongoConfig {

    @Bean
    public MongoClientSettingsBuilderCustomizer mongoRetryWritesCustomizer() {
        // Cosmos DB's Mongo API rejects retryable writes, so disable them centrally.
        return clientSettingsBuilder -> clientSettingsBuilder.retryWrites(false);
    }
}
