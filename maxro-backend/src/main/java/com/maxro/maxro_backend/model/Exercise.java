package com.maxro.maxro_backend.model;

import java.util.ArrayList;
import java.util.List;

public class Exercise {

    private String name;
    private String muscleGroup;
    private List<ExerciseSet> sets = new ArrayList<>();

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getMuscleGroup() { return muscleGroup; }
    public void setMuscleGroup(String muscleGroup) { this.muscleGroup = muscleGroup; }

    public List<ExerciseSet> getSets() { return sets; }
    public void setSets(List<ExerciseSet> sets) { this.sets = sets; }
}
