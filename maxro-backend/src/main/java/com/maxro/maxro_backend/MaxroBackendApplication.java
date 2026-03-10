package com.maxro.maxro_backend;

import com.maxro.maxro_backend.repository.PersonalRecordRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MaxroBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(MaxroBackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner cleanUpGhostPRs(PersonalRecordRepository prRepository) {
		return args -> {
			// Find all PRs that don't have a workoutId and delete them
			// Actually, PRs created before workoutId was added will have workoutId = null
			var allPRs = prRepository.findAll();
			int deleted = 0;
			for (var pr : allPRs) {
				if (pr.getWorkoutId() == null || pr.getWorkoutId().isEmpty()) {
					prRepository.delete(pr);
					deleted++;
				}
			}
			if (deleted > 0) {
				System.out.println("Cleaned up " + deleted + " ghost Personal Records.");
			}
		};
	}
}
