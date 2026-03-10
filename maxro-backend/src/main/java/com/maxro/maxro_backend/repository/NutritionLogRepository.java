package com.maxro.maxro_backend.repository;

import com.maxro.maxro_backend.model.NutritionLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface NutritionLogRepository extends MongoRepository<NutritionLog, String> {

    Optional<NutritionLog> findByUserIdAndDate(String userId, LocalDate date);

    @Query("{ 'userId' : ?0, $or : [ { 'date' : ?1 }, { 'date' : ?2 } ] }")
    Optional<NutritionLog> findByUserIdAndDateFlexible(String userId, String dateStr, LocalDate date);

    @Query("{ 'userId' : ?0, $or : [ " +
           "{ 'date' : { $gte : ?1, $lte : ?2 } }, " +
           "{ 'date' : { $gte : ?3, $lte : ?4 } } ] }")
    List<NutritionLog> findByUserIdAndDateBetweenFlexible(
            String userId, String startStr, String endStr, LocalDate startDate, LocalDate endDate);

    void deleteByUserId(String userId);
}
