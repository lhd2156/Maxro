package com.maxro.maxro_backend.util;

/**
 * Utility methods for comparing set performance and calculating training metrics.
 */
public final class FitnessCalculator {

    private FitnessCalculator() {}

    public static double estimateOneRepMax(double weight, int reps) {
        if (reps <= 0 || weight <= 0) return 0.0;
        if (reps == 1) return weight;
        return Math.round(weight * (1 + reps / 30.0) * 100.0) / 100.0;
    }

    /**
     * Uses estimated 1RM for weighted movements and rep count for bodyweight movements.
     */
    public static double scorePerformance(double weight, int reps) {
        if (reps <= 0) return 0.0;
        if (weight <= 0) return reps;
        return estimateOneRepMax(weight, reps);
    }

    public static double calculateVolume(double weight, int reps) {
        return weight * reps;
    }
}