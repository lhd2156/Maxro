package com.maxro.maxro_backend.dto.workout;

import com.maxro.maxro_backend.model.Workout;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * DTO that maps Spring's Page to GraphQL WorkoutPage schema.
 * Spring Page has getNumber() but schema expects currentPage.
 */
public record WorkoutPageDto(
        List<Workout> content,
        long totalElements,
        int totalPages,
        int currentPage
) {
    public static WorkoutPageDto from(Page<Workout> page) {
        return new WorkoutPageDto(
                page.getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber()
        );
    }
}
