package com.maxro.maxro_backend.model;

public class ExerciseSet {

    private int reps;
    private double weightLbs;

    public ExerciseSet() {}

    public ExerciseSet(int reps, double weightLbs) {
        this.reps = reps;
        this.weightLbs = weightLbs;
    }

    public int getReps() { return reps; }
    public void setReps(int reps) { this.reps = reps; }

    public double getWeightLbs() { return weightLbs; }
    public void setWeightLbs(double weightLbs) { this.weightLbs = weightLbs; }
}
