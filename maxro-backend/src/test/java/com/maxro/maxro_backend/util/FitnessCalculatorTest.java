package com.maxro.maxro_backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FitnessCalculatorTest {

    @Test
    void estimateOneRepMax_returnsSameWeightForSingleRep() {
        assertEquals(315.0, FitnessCalculator.estimateOneRepMax(315, 1));
    }

    @Test
    void estimateOneRepMax_appliesEpleyFormulaForMultipleReps() {
        // Epley: 225 * (1 + 5/30) = 225 * 1.1667 ≈ 262.5
        double result = FitnessCalculator.estimateOneRepMax(225, 5);
        assertEquals(262.5, result, 0.01);
    }

    @Test
    void estimateOneRepMax_returnsZeroForInvalidInputs() {
        assertEquals(0.0, FitnessCalculator.estimateOneRepMax(0, 5));
        assertEquals(0.0, FitnessCalculator.estimateOneRepMax(100, 0));
        assertEquals(0.0, FitnessCalculator.estimateOneRepMax(-50, 3));
    }

    @Test
    void calculateVolume_multipliesWeightByReps() {
        assertEquals(1125.0, FitnessCalculator.calculateVolume(225, 5));
    }
}
