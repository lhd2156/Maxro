package com.maxro.maxro_backend.repository;

import com.maxro.maxro_backend.model.PersonalRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PersonalRecordRepository extends MongoRepository<PersonalRecord, String> {

    List<PersonalRecord> findByUserIdOrderByAchievedAtDesc(String userId);

    List<PersonalRecord> findByUserIdAndExerciseNameOrderByAchievedAtDesc(String userId, String exerciseName);

    Optional<PersonalRecord> findTopByUserIdAndExerciseNameOrderByOneRepMaxLbsDesc(
            String userId, String exerciseName);

    List<PersonalRecord> findByUserIdAndAchievedAtAfterOrderByAchievedAtDesc(
            String userId, Instant after);

    void deleteByWorkoutId(String workoutId);

    void deleteByUserId(String userId);
}
