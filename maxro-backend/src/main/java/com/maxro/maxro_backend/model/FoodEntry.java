package com.maxro.maxro_backend.model;

import java.util.UUID;

public class FoodEntry {

    private String id;
    private String foodName;
    private String brandName;
    private String mealType;
    private double servingQty;
    private String servingUnit;
    private double calories;
    private double proteinG;
    private double carbsG;
    private double fatG;
    private double fiberG;
    private double sugarG;
    private double sodiumMg;
    private double cholesterolMg;
    private double saturatedFatG;
    private double potassiumMg;
    private String thumbnailUrl;

    public FoodEntry() {
        this.id = UUID.randomUUID().toString();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFoodName() { return foodName; }
    public void setFoodName(String foodName) { this.foodName = foodName; }

    public String getBrandName() { return brandName; }
    public void setBrandName(String brandName) { this.brandName = brandName; }

    public String getMealType() { return mealType; }
    public void setMealType(String mealType) { this.mealType = mealType; }

    public double getServingQty() { return servingQty; }
    public void setServingQty(double servingQty) { this.servingQty = servingQty; }

    public String getServingUnit() { return servingUnit; }
    public void setServingUnit(String servingUnit) { this.servingUnit = servingUnit; }

    public double getCalories() { return calories; }
    public void setCalories(double calories) { this.calories = calories; }

    public double getProteinG() { return proteinG; }
    public void setProteinG(double proteinG) { this.proteinG = proteinG; }

    public double getCarbsG() { return carbsG; }
    public void setCarbsG(double carbsG) { this.carbsG = carbsG; }

    public double getFatG() { return fatG; }
    public void setFatG(double fatG) { this.fatG = fatG; }

    public double getFiberG() { return fiberG; }
    public void setFiberG(double fiberG) { this.fiberG = fiberG; }

    public double getSugarG() { return sugarG; }
    public void setSugarG(double sugarG) { this.sugarG = sugarG; }

    public double getSodiumMg() { return sodiumMg; }
    public void setSodiumMg(double sodiumMg) { this.sodiumMg = sodiumMg; }

    public double getCholesterolMg() { return cholesterolMg; }
    public void setCholesterolMg(double cholesterolMg) { this.cholesterolMg = cholesterolMg; }

    public double getSaturatedFatG() { return saturatedFatG; }
    public void setSaturatedFatG(double saturatedFatG) { this.saturatedFatG = saturatedFatG; }

    public double getPotassiumMg() { return potassiumMg; }
    public void setPotassiumMg(double potassiumMg) { this.potassiumMg = potassiumMg; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
}
