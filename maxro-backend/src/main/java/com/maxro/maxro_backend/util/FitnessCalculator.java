package com.maxro.maxro_backend.util;

/**
 * Epley formula for estimated one-rep max and volume calculations.
 */
public final class FitnessCalculator {

    private FitnessCalculator() {}

    public static double estimateOneRepMax(double weight, int reps) {
        if (reps <= 0 || weight <= 0) return 0.0;
        if (reps == 1) return weight;
        return Math.round(weight * (1 + reps / 30.0) * 100.0) / 100.0;
    }

    public static double calculateVolume(double weight, int reps) {
        return weight * reps;
    }
}
