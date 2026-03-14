package com.maxro.maxro_backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Document(collection = "personal_records")
@CompoundIndexes({
        @CompoundIndex(name = "user_exercise_idx", def = "{'userId': 1, 'exerciseName': 1}"),
        @CompoundIndex(name = "user_achieved_at_idx", def = "{'userId': 1, 'achievedAt': -1}"),
        @CompoundIndex(name = "user_exercise_achieved_at_idx", def = "{'userId': 1, 'exerciseName': 1, 'achievedAt': -1}"),
        @CompoundIndex(name = "user_exercise_orm_idx", def = "{'userId': 1, 'exerciseName': 1, 'oneRepMaxLbs': -1}")
})
public class PersonalRecord {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String exerciseName;
    private double weightLbs;
    private int reps;
    private double oneRepMaxLbs;
    private Instant achievedAt;
    private LocalDate workoutDate;

    @Indexed
    private String workoutId;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getExerciseName() { return exerciseName; }
    public void setExerciseName(String exerciseName) { this.exerciseName = exerciseName; }

    public double getWeightLbs() { return weightLbs; }
    public void setWeightLbs(double weightLbs) { this.weightLbs = weightLbs; }

    public int getReps() { return reps; }
    public void setReps(int reps) { this.reps = reps; }

    public double getOneRepMaxLbs() { return oneRepMaxLbs; }
    public void setOneRepMaxLbs(double oneRepMaxLbs) { this.oneRepMaxLbs = oneRepMaxLbs; }

    public Instant getAchievedAt() { return achievedAt; }
    public void setAchievedAt(Instant achievedAt) { this.achievedAt = achievedAt; }

    public LocalDate getWorkoutDate() { return workoutDate; }
    public void setWorkoutDate(LocalDate workoutDate) { this.workoutDate = workoutDate; }

    public String getWorkoutId() { return workoutId; }
    public void setWorkoutId(String workoutId) { this.workoutId = workoutId; }
}
