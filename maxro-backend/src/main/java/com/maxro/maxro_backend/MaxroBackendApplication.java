package com.maxro.maxro_backend;

import com.maxro.maxro_backend.repository.PersonalRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MaxroBackendApplication {

    private static final Logger log = LoggerFactory.getLogger(MaxroBackendApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(MaxroBackendApplication.class, args);
    }

    @Bean
    @ConditionalOnProperty(name = "maxro.pr.cleanup.enabled", havingValue = "true", matchIfMissing = false)
    public CommandLineRunner cleanUpGhostPRs(PersonalRecordRepository prRepository) {
        return args -> {
            try {
                int deleted = 0;
                for (var pr : prRepository.findAll()) {
                    if (pr.getWorkoutId() == null || pr.getWorkoutId().isEmpty()) {
                        prRepository.delete(pr);
                        deleted++;
                    }
                }
                if (deleted > 0) {
                    log.info("Cleaned up {} ghost personal records on startup", deleted);
                }
            } catch (Exception ex) {
                log.warn("Skipping startup personal record cleanup: {}", ex.getMessage());
            }
        };
    }
}