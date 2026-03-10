package com.maxro.maxro_backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "nutrition_logs")
@CompoundIndex(name = "user_date_idx", def = "{'userId': 1, 'date': 1}", unique = true)
public class NutritionLog {

    @Id
    private String id;

    @Indexed
    private String userId;

    private LocalDate date;
    private List<FoodEntry> entries = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public List<FoodEntry> getEntries() { return entries; }
    public void setEntries(List<FoodEntry> entries) { this.entries = entries; }

    public double getTotalCalories() {
        return entries.stream().mapToDouble(FoodEntry::getCalories).sum();
    }

    public double getTotalProteinG() {
        return entries.stream().mapToDouble(FoodEntry::getProteinG).sum();
    }

    public double getTotalCarbsG() {
        return entries.stream().mapToDouble(FoodEntry::getCarbsG).sum();
    }

    public double getTotalFatG() {
        return entries.stream().mapToDouble(FoodEntry::getFatG).sum();
    }

    public double getTotalFiberG() {
        return entries.stream().mapToDouble(FoodEntry::getFiberG).sum();
    }

    public double getTotalSugarG() {
        return entries.stream().mapToDouble(FoodEntry::getSugarG).sum();
    }

    public double getTotalSodiumMg() {
        return entries.stream().mapToDouble(FoodEntry::getSodiumMg).sum();
    }

    public double getTotalCholesterolMg() {
        return entries.stream().mapToDouble(FoodEntry::getCholesterolMg).sum();
    }

    public double getTotalSaturatedFatG() {
        return entries.stream().mapToDouble(FoodEntry::getSaturatedFatG).sum();
    }

    public double getTotalPotassiumMg() {
        return entries.stream().mapToDouble(FoodEntry::getPotassiumMg).sum();
    }
}
