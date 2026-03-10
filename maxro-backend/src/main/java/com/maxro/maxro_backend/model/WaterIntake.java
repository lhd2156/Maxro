package com.maxro.maxro_backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "water_intake")
@CompoundIndex(name = "user_date_idx", def = "{'userId': 1, 'date': 1}", unique = true)
public class WaterIntake {

    @Id
    private String id;

    @Indexed
    private String userId;

    private LocalDate date;
    private double goalOz;
    private List<WaterEntry> entries = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public double getGoalOz() { return goalOz; }
    public void setGoalOz(double goalOz) { this.goalOz = goalOz; }

    public List<WaterEntry> getEntries() { return entries; }
    public void setEntries(List<WaterEntry> entries) { this.entries = entries; }

    public double getTotalOz() {
        return entries.stream().mapToDouble(WaterEntry::getAmountOz).sum();
    }

    public boolean isGoalMet() {
        return getTotalOz() >= goalOz;
    }
}
