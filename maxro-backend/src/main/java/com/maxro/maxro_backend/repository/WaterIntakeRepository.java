package com.maxro.maxro_backend.repository;

import com.maxro.maxro_backend.model.WaterIntake;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WaterIntakeRepository extends MongoRepository<WaterIntake, String> {

    Optional<WaterIntake> findByUserIdAndDate(String userId, LocalDate date);

    /** Matches documents whether date is stored as ISO string or BSON Date (avoids empty dashboard for that day). */
    @Query("{ 'userId' : ?0, $or : [ { 'date' : ?1 }, { 'date' : ?2 } ] }")
    Optional<WaterIntake> findByUserIdAndDateFlexible(String userId, String dateStr, LocalDate date);

    @Query("{ 'userId' : ?0, $or : [ " +
           "{ 'date' : { $gte : ?1, $lte : ?2 } }, " +
           "{ 'date' : { $gte : ?3, $lte : ?4 } } ] }")
    List<WaterIntake> findByUserIdAndDateBetweenFlexible(
            String userId, String startStr, String endStr, LocalDate startDate, LocalDate endDate);

    void deleteByUserId(String userId);
}
