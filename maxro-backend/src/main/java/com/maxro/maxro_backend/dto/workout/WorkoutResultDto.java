package com.maxro.maxro_backend.dto.workout;

import com.maxro.maxro_backend.model.PersonalRecord;
import com.maxro.maxro_backend.model.Workout;

import java.util.List;

public record WorkoutResultDto(
        Workout workout,
        List<PersonalRecord> newPersonalRecords
) {}
