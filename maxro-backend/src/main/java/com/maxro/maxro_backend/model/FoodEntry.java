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
    private double addedSugarG;
    private double sodiumMg;
    private double cholesterolMg;
    private double saturatedFatG;
    private double potassiumMg;
    private double caffeineMg;
    private double electrolytesMg;
    private double vitaminAMcg;
    private double vitaminCMg;
    private double vitaminDMcg;
    private double vitaminEMg;
    private double vitaminKMcg;
    private double thiaminMg;
    private double riboflavinMg;
    private double niacinMg;
    private double vitaminB6Mg;
    private double vitaminB12Mcg;
    private double folateMcg;
    private double zincMg;
    private double calciumMg;
    private double ironMg;
    private double magnesiumMg;
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

    public double getAddedSugarG() { return addedSugarG; }
    public void setAddedSugarG(double addedSugarG) { this.addedSugarG = addedSugarG; }

    public double getSodiumMg() { return sodiumMg; }
    public void setSodiumMg(double sodiumMg) { this.sodiumMg = sodiumMg; }

    public double getCholesterolMg() { return cholesterolMg; }
    public void setCholesterolMg(double cholesterolMg) { this.cholesterolMg = cholesterolMg; }

    public double getSaturatedFatG() { return saturatedFatG; }
    public void setSaturatedFatG(double saturatedFatG) { this.saturatedFatG = saturatedFatG; }

    public double getPotassiumMg() { return potassiumMg; }
    public void setPotassiumMg(double potassiumMg) { this.potassiumMg = potassiumMg; }

    public double getCaffeineMg() { return caffeineMg; }
    public void setCaffeineMg(double caffeineMg) { this.caffeineMg = caffeineMg; }

    public double getElectrolytesMg() { return electrolytesMg; }
    public void setElectrolytesMg(double electrolytesMg) { this.electrolytesMg = electrolytesMg; }

    public double getVitaminAMcg() { return vitaminAMcg; }
    public void setVitaminAMcg(double vitaminAMcg) { this.vitaminAMcg = vitaminAMcg; }

    public double getVitaminCMg() { return vitaminCMg; }
    public void setVitaminCMg(double vitaminCMg) { this.vitaminCMg = vitaminCMg; }

    public double getVitaminDMcg() { return vitaminDMcg; }
    public void setVitaminDMcg(double vitaminDMcg) { this.vitaminDMcg = vitaminDMcg; }

    public double getVitaminEMg() { return vitaminEMg; }
    public void setVitaminEMg(double vitaminEMg) { this.vitaminEMg = vitaminEMg; }

    public double getVitaminKMcg() { return vitaminKMcg; }
    public void setVitaminKMcg(double vitaminKMcg) { this.vitaminKMcg = vitaminKMcg; }

    public double getThiaminMg() { return thiaminMg; }
    public void setThiaminMg(double thiaminMg) { this.thiaminMg = thiaminMg; }

    public double getRiboflavinMg() { return riboflavinMg; }
    public void setRiboflavinMg(double riboflavinMg) { this.riboflavinMg = riboflavinMg; }

    public double getNiacinMg() { return niacinMg; }
    public void setNiacinMg(double niacinMg) { this.niacinMg = niacinMg; }

    public double getVitaminB6Mg() { return vitaminB6Mg; }
    public void setVitaminB6Mg(double vitaminB6Mg) { this.vitaminB6Mg = vitaminB6Mg; }

    public double getVitaminB12Mcg() { return vitaminB12Mcg; }
    public void setVitaminB12Mcg(double vitaminB12Mcg) { this.vitaminB12Mcg = vitaminB12Mcg; }

    public double getFolateMcg() { return folateMcg; }
    public void setFolateMcg(double folateMcg) { this.folateMcg = folateMcg; }

    public double getZincMg() { return zincMg; }
    public void setZincMg(double zincMg) { this.zincMg = zincMg; }

    public double getCalciumMg() { return calciumMg; }
    public void setCalciumMg(double calciumMg) { this.calciumMg = calciumMg; }

    public double getIronMg() { return ironMg; }
    public void setIronMg(double ironMg) { this.ironMg = ironMg; }

    public double getMagnesiumMg() { return magnesiumMg; }
    public void setMagnesiumMg(double magnesiumMg) { this.magnesiumMg = magnesiumMg; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
}
