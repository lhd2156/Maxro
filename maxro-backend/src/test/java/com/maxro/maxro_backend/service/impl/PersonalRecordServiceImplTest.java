package com.maxro.maxro_backend.service.impl;

import com.maxro.maxro_backend.model.Exercise;
import com.maxro.maxro_backend.model.ExerciseSet;
import com.maxro.maxro_backend.model.PersonalRecord;
import com.maxro.maxro_backend.repository.PersonalRecordRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PersonalRecordServiceImplTest {

    @Mock private PersonalRecordRepository personalRecordRepository;
    @InjectMocks private PersonalRecordServiceImpl prService;

    @Test
    void checkAndUpdatePRs_createsNewPRWhenNoneExists() {
        Exercise ex = buildExercise("Bench Press", 225, 5);
        when(personalRecordRepository
                .findTopByUserIdAndExerciseNameOrderByOneRepMaxLbsDesc("u1", "Bench Press"))
                .thenReturn(Optional.empty());
        when(personalRecordRepository.save(any(PersonalRecord.class)))
                .thenAnswer(inv -> {
                    PersonalRecord pr = inv.getArgument(0);
                    pr.setId("pr-1");
                    return pr;
                });

        List<PersonalRecord> newPRs = prService.checkAndUpdatePRs("u1", "wk-1", List.of(ex));

        assertEquals(1, newPRs.size());
        assertEquals("Bench Press", newPRs.get(0).getExerciseName());
        assertEquals(225, newPRs.get(0).getWeightLbs());
    }

    @Test
    void checkAndUpdatePRs_createsNewPRWhenEstimated1RMExceedsExisting() {
        Exercise ex = buildExercise("Squat", 315, 3);

        PersonalRecord existing = new PersonalRecord();
        existing.setOneRepMaxLbs(300.0);
        when(personalRecordRepository
                .findTopByUserIdAndExerciseNameOrderByOneRepMaxLbsDesc("u1", "Squat"))
                .thenReturn(Optional.of(existing));
        when(personalRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<PersonalRecord> newPRs = prService.checkAndUpdatePRs("u1", "wk-1", List.of(ex));

        assertFalse(newPRs.isEmpty(), "Should detect new PR when estimated 1RM exceeds existing");
        assertTrue(newPRs.get(0).getOneRepMaxLbs() > 300.0);
    }

    @Test
    void checkAndUpdatePRs_createsBodyweightPrUsingRepCount() {
        Exercise ex = buildExercise("Push Up", 0, 25);
        when(personalRecordRepository
                .findTopByUserIdAndExerciseNameOrderByOneRepMaxLbsDesc("u1", "Push Up"))
                .thenReturn(Optional.empty());
        when(personalRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<PersonalRecord> newPRs = prService.checkAndUpdatePRs("u1", "wk-1", List.of(ex));

        assertEquals(1, newPRs.size());
        assertEquals(0.0, newPRs.get(0).getWeightLbs());
        assertEquals(25, newPRs.get(0).getReps());
        assertEquals(25.0, newPRs.get(0).getOneRepMaxLbs());
    }

    @Test
    void checkAndUpdatePRs_comparesBodyweightPrsByRepCount() {
        Exercise ex = buildExercise("Push Up", 0, 22);

        PersonalRecord existing = new PersonalRecord();
        existing.setOneRepMaxLbs(20.0);
        when(personalRecordRepository
                .findTopByUserIdAndExerciseNameOrderByOneRepMaxLbsDesc("u1", "Push Up"))
                .thenReturn(Optional.of(existing));
        when(personalRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<PersonalRecord> newPRs = prService.checkAndUpdatePRs("u1", "wk-1", List.of(ex));

        assertEquals(1, newPRs.size());
        assertEquals(22.0, newPRs.get(0).getOneRepMaxLbs());
    }

    @Test
    void checkAndUpdatePRs_skipsWhenBelowExisting() {
        Exercise ex = buildExercise("Curl", 30, 10);

        PersonalRecord existing = new PersonalRecord();
        existing.setOneRepMaxLbs(999.0);
        when(personalRecordRepository
                .findTopByUserIdAndExerciseNameOrderByOneRepMaxLbsDesc("u1", "Curl"))
                .thenReturn(Optional.of(existing));

        List<PersonalRecord> newPRs = prService.checkAndUpdatePRs("u1", "wk-1", List.of(ex));

        assertTrue(newPRs.isEmpty());
        verify(personalRecordRepository, never()).save(any());
    }

    @Test
    void getPersonalRecords_delegatesToRepository() {
        when(personalRecordRepository.findByUserIdOrderByAchievedAtDesc("u1"))
                .thenReturn(List.of());

        prService.getPersonalRecords("u1");

        verify(personalRecordRepository).findByUserIdOrderByAchievedAtDesc("u1");
    }

    @Test
    void getRecentPRs_queriesWithCorrectTimeBound() {
        prService.getRecentPRs("u1", 7);

        verify(personalRecordRepository)
                .findByUserIdAndAchievedAtAfterOrderByAchievedAtDesc(eq("u1"), any(Instant.class));
    }

    private Exercise buildExercise(String name, double weight, int reps) {
        Exercise ex = new Exercise();
        ex.setName(name);
        ex.setMuscleGroup("Test");
        ex.setSets(List.of(new ExerciseSet(reps, weight)));
        return ex;
    }
}