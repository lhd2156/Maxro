package com.maxro.maxro_backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String password;
    private String displayName;
    private String firstName;
    private String lastName;
    private Double bodyWeightLbs;
    private Double heightInches;
    private String fitnessGoal;
    private Integer dailyCalorieTarget;
    private Integer dailyProteinTarget;
    private Integer dailyCarbTarget;
    private Integer dailyFatTarget;
    private Double dailyWaterGoalOz;
    private String dateOfBirth;
    private String gender;
    private Boolean agreedToTerms;
    private Boolean profileComplete;

    @CreatedDate
    private Instant createdAt;

    public User() {
        this.dailyCalorieTarget = 2000;
        this.dailyProteinTarget = 150;
        this.dailyCarbTarget = 250;
        this.dailyFatTarget = 65;
        this.dailyWaterGoalOz = 64.0;
        this.agreedToTerms = false;
        this.profileComplete = false;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getDisplayName() {
        if (firstName != null && lastName != null) return (firstName + " " + lastName).trim();
        if (firstName != null) return firstName.trim();
        return displayName;
    }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public Double getBodyWeightLbs() { return bodyWeightLbs; }
    public void setBodyWeightLbs(Double bodyWeightLbs) { this.bodyWeightLbs = bodyWeightLbs; }

    public Double getHeightInches() { return heightInches; }
    public void setHeightInches(Double heightInches) { this.heightInches = heightInches; }

    public String getFitnessGoal() { return fitnessGoal; }
    public void setFitnessGoal(String fitnessGoal) { this.fitnessGoal = fitnessGoal; }

    public Integer getDailyCalorieTarget() { return dailyCalorieTarget; }
    public void setDailyCalorieTarget(Integer dailyCalorieTarget) { this.dailyCalorieTarget = dailyCalorieTarget; }

    public Integer getDailyProteinTarget() { return dailyProteinTarget; }
    public void setDailyProteinTarget(Integer dailyProteinTarget) { this.dailyProteinTarget = dailyProteinTarget; }

    public Integer getDailyCarbTarget() { return dailyCarbTarget; }
    public void setDailyCarbTarget(Integer dailyCarbTarget) { this.dailyCarbTarget = dailyCarbTarget; }

    public Integer getDailyFatTarget() { return dailyFatTarget; }
    public void setDailyFatTarget(Integer dailyFatTarget) { this.dailyFatTarget = dailyFatTarget; }

    public Double getDailyWaterGoalOz() { return dailyWaterGoalOz; }
    public void setDailyWaterGoalOz(Double dailyWaterGoalOz) { this.dailyWaterGoalOz = dailyWaterGoalOz; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public Boolean getAgreedToTerms() { return agreedToTerms; }
    public void setAgreedToTerms(Boolean agreedToTerms) { this.agreedToTerms = agreedToTerms; }

    public Boolean getProfileComplete() { return profileComplete; }
    public void setProfileComplete(Boolean profileComplete) { this.profileComplete = profileComplete; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
