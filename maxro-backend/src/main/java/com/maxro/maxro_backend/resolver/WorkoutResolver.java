package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.dto.workout.WorkoutPageDto;
import com.maxro.maxro_backend.dto.workout.WorkoutResultDto;
import com.maxro.maxro_backend.model.Exercise;
import com.maxro.maxro_backend.model.ExerciseSet;
import com.maxro.maxro_backend.model.PersonalRecord;
import com.maxro.maxro_backend.model.Workout;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.PersonalRecordService;
import com.maxro.maxro_backend.service.WorkoutService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class WorkoutResolver {

    private final WorkoutService workoutService;
    private final PersonalRecordService personalRecordService;
    private final SecurityContextHelper securityContextHelper;

    public WorkoutResolver(WorkoutService workoutService,
                           PersonalRecordService personalRecordService,
                           SecurityContextHelper securityContextHelper) {
        this.workoutService = workoutService;
        this.personalRecordService = personalRecordService;
        this.securityContextHelper = securityContextHelper;
    }

    @QueryMapping
    public Workout getWorkout(@Argument String id) {
        return workoutService.getWorkout(securityContextHelper.getCurrentUserId(), id);
    }

    @QueryMapping
    public WorkoutPageDto getWorkouts(@Argument String startDate, @Argument String endDate,
                                     @Argument Integer page, @Argument Integer size) {
        LocalDate start = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate end = endDate != null ? LocalDate.parse(endDate) : null;
        int p = page != null ? page : 0;
        int s = size != null ? size : 20;
        return WorkoutPageDto.from(workoutService.getWorkouts(securityContextHelper.getCurrentUserId(), start, end, p, s));
    }

    @QueryMapping
    public WorkoutPageDto getWorkoutsByExercise(@Argument String exerciseName,
                                               @Argument Integer page, @Argument Integer size) {
        int p = page != null ? page : 0;
        int s = size != null ? size : 20;
        return WorkoutPageDto.from(workoutService.getWorkoutsByExercise(securityContextHelper.getCurrentUserId(), exerciseName, p, s));
    }

    @QueryMapping
    public List<String> getExerciseNames() {
        return workoutService.getExerciseNames(securityContextHelper.getCurrentUserId());
    }

    @QueryMapping
    public List<String> getMuscleGroups() {
        return workoutService.getMuscleGroups(securityContextHelper.getCurrentUserId());
    }

    @QueryMapping
    public List<String> getPopularExercises(@Argument String muscleGroup) {
        return workoutService.getPopularExercises(muscleGroup);
    }

    @MutationMapping
    public WorkoutResultDto logWorkout(@Argument Map<String, Object> input) {
        String userId = securityContextHelper.getCurrentUserId();

        Workout workout = new Workout();
        workout.setDate(LocalDate.parse((String) input.get("date")));
        workout.setNotes((String) input.get("notes"));

        List<Map<String, Object>> exercisesInput = (List<Map<String, Object>>) input.get("exercises");
        List<Exercise> exercises = exercisesInput.stream().map(exInput -> {
            Exercise ex = new Exercise();
            ex.setName((String) exInput.get("name"));
            ex.setMuscleGroup((String) exInput.get("muscleGroup"));

            List<Map<String, Object>> setsInput = (List<Map<String, Object>>) exInput.get("sets");
            List<ExerciseSet> sets = setsInput.stream().map(setInput -> {
                ExerciseSet set = new ExerciseSet();
                set.setReps((Integer) setInput.get("reps"));
                set.setWeightLbs(((Number) setInput.get("weightLbs")).doubleValue());
                return set;
            }).collect(Collectors.toList());

            ex.setSets(sets);
            return ex;
        }).collect(Collectors.toList());

        workout.setExercises(exercises);

        Workout savedWorkout = workoutService.logWorkout(userId, workout);
        List<PersonalRecord> newPRs = personalRecordService.checkAndUpdatePRs(userId, savedWorkout.getId(), savedWorkout.getExercises());

        return new WorkoutResultDto(savedWorkout, newPRs);
    }

    @MutationMapping
    public boolean deleteWorkout(@Argument String id) {
        workoutService.deleteWorkout(securityContextHelper.getCurrentUserId(), id);
        return true;
    }
}
