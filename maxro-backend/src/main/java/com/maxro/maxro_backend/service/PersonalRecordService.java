package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.model.Exercise;
import com.maxro.maxro_backend.model.PersonalRecord;

import java.util.List;

public interface PersonalRecordService {

    List<PersonalRecord> checkAndUpdatePRs(String userId, String workoutId, List<Exercise> exercises);

    List<PersonalRecord> getPersonalRecords(String userId);

    List<PersonalRecord> getPersonalRecordsByExercise(String userId, String exerciseName);

    List<PersonalRecord> getRecentPRs(String userId, int days);

    void deletePRsForWorkout(String workoutId);
}
