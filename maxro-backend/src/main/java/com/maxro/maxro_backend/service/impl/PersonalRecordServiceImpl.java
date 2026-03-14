package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.model.Exercise;
import com.maxro.maxro_backend.model.ExerciseSet;
import com.maxro.maxro_backend.model.PersonalRecord;
import com.maxro.maxro_backend.repository.PersonalRecordRepository;
import com.maxro.maxro_backend.service.PersonalRecordService;
import com.maxro.maxro_backend.util.FitnessCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class PersonalRecordServiceImpl implements PersonalRecordService {

    private static final Logger log = LoggerFactory.getLogger(PersonalRecordServiceImpl.class);

    private final PersonalRecordRepository personalRecordRepository;

    public PersonalRecordServiceImpl(PersonalRecordRepository personalRecordRepository) {
        this.personalRecordRepository = personalRecordRepository;
    }

    @Override
    public List<PersonalRecord> checkAndUpdatePRs(String userId, String workoutId, LocalDate workoutDate, List<Exercise> exercises) {
        log.debug("Checking PRs for user: {} across {} exercises", userId, exercises.size());
        List<PersonalRecord> newPRs = new ArrayList<>();

        for (Exercise exercise : exercises) {
            for (ExerciseSet set : exercise.getSets()) {
                double performanceScore = FitnessCalculator.scorePerformance(set.getWeightLbs(), set.getReps());
                if (performanceScore <= 0) {
                    continue;
                }

                Optional<PersonalRecord> existingPR = personalRecordRepository
                    .findTopByUserIdAndExerciseNameIgnoreCaseOrderByOneRepMaxLbsDesc(userId, exercise.getName());

                boolean isNewPR = existingPR.isEmpty() || performanceScore > existingPR.get().getOneRepMaxLbs();

                if (isNewPR) {
                    PersonalRecord pr = new PersonalRecord();
                    pr.setUserId(userId);
                    pr.setWorkoutId(workoutId);
                    pr.setExerciseName(exercise.getName());
                    pr.setWeightLbs(set.getWeightLbs());
                    pr.setReps(set.getReps());
                    pr.setOneRepMaxLbs(performanceScore);
                    pr.setAchievedAt(Instant.now());
                    pr.setWorkoutDate(workoutDate);

                    PersonalRecord saved = personalRecordRepository.save(pr);
                    newPRs.add(saved);
                    log.info("New PR for user: {} on {}: {} lbs x {} reps (score: {})",
                            userId, exercise.getName(), set.getWeightLbs(), set.getReps(), performanceScore);
                }
            }
        }

        return newPRs;
    }

    @Override
    public List<PersonalRecord> getPersonalRecords(String userId) {
        log.debug("Fetching all PRs for user: {}", userId);
        return personalRecordRepository.findByUserIdOrderByAchievedAtDesc(userId);
    }

    @Override
    public List<PersonalRecord> getPersonalRecordsByExercise(String userId, String exerciseName) {
        log.debug("Fetching PRs for user: {} on exercise: {}", userId, exerciseName);
        return personalRecordRepository.findByUserIdAndExerciseNameIgnoreCaseOrderByAchievedAtDesc(userId, exerciseName);
    }

    @Override
    public List<PersonalRecord> getRecentPRs(String userId, int days) {
        log.debug("Fetching recent PRs for user: {} within {} days", userId, days);
        Instant after = Instant.now().minus(days, ChronoUnit.DAYS);
        return personalRecordRepository.findByUserIdAndAchievedAtAfterOrderByAchievedAtDesc(userId, after);
    }

    @Override
    public void deletePRsForWorkout(String workoutId) {
        log.info("Deleting PRs associated with workout: {}", workoutId);
        personalRecordRepository.deleteByWorkoutId(workoutId);
    }
}