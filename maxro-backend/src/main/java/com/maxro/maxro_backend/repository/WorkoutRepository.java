package com.maxro.maxro_backend.repository;

import com.maxro.maxro_backend.model.Workout;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkoutRepository extends MongoRepository<Workout, String> {

    Page<Workout> findByUserIdOrderByDateDesc(String userId, Pageable pageable);

    Page<Workout> findByUserIdAndDateBetweenOrderByDateDesc(
            String userId, LocalDate startDate, LocalDate endDate, Pageable pageable);

    @Query("{'userId': ?0, 'exercises.name': ?1}")
    Page<Workout> findByUserIdAndExerciseName(String userId, String exerciseName, Pageable pageable);

    Optional<Workout> findByUserIdAndDate(String userId, LocalDate date);

    @Query("{ 'userId' : ?0, $or : [ { 'date' : ?1 }, { 'date' : ?2 } ] }")
    Optional<Workout> findByUserIdAndDateFlexible(String userId, String dateStr, LocalDate date);

        @Query("{ 'userId' : ?0, $or : [ { 'date' : ?1 }, { 'date' : ?2 } ] }")
        List<Workout> findAllByUserIdAndDateFlexible(String userId, String dateStr, LocalDate date);

    List<Workout> findByUserIdOrderByDateAsc(String userId);

    @Query("{ 'userId' : ?0, $or : [ " +
           "{ 'date' : { $gte : ?1, $lte : ?2 } }, " +
           "{ 'date' : { $gte : ?3, $lte : ?4 } } ] }")
    Page<Workout> findByUserIdAndDateBetweenFlexible(
            String userId, String startStr, String endStr, LocalDate startDate, LocalDate endDate, Pageable pageable);

    @Query("{ 'userId' : ?0, $or : [ " +
           "{ 'date' : { $gte : ?1, $lte : ?2 } }, " +
           "{ 'date' : { $gte : ?3, $lte : ?4 } } ] }")
    List<Workout> findByUserIdAndDateBetweenOrderByDateAsc(
            String userId, String startStr, String endStr, LocalDate startDate, LocalDate endDate);

    @Query(value = "{'userId': ?0}", fields = "{'date': 1}")
    List<Workout> findAllDatesByUserId(String userId);

    @Query("{'userId': ?0, 'exercises.name': {$exists: true}}")
    List<Workout> findAllByUserIdWithExercises(String userId);

    long countByUserId(String userId);

    void deleteByUserId(String userId);
}