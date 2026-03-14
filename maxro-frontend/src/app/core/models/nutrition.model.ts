export interface NutritionLog {
  id: string;
  userId: string;
  date: string;
  entries: FoodEntry[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  totalSugarG: number;
  totalAddedSugarG: number;
  totalSodiumMg: number;
  totalCholesterolMg: number;
  totalSaturatedFatG: number;
  totalPotassiumMg: number;
  totalCaffeineMg: number;
  totalElectrolytesMg: number;
  totalVitaminAMcg: number;
  totalVitaminCMg: number;
  totalVitaminDMcg: number;
  totalVitaminEMg: number;
  totalVitaminKMcg: number;
  totalThiaminMg: number;
  totalRiboflavinMg: number;
  totalNiacinMg: number;
  totalVitaminB6Mg: number;
  totalVitaminB12Mcg: number;
  totalFolateMcg: number;
  totalZincMg: number;
  totalCalciumMg: number;
  totalIronMg: number;
  totalMagnesiumMg: number;
}

export interface FoodEntry {
  id: string;
  foodName: string;
  brandName: string | null;
  mealType: string;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  addedSugarG: number;
  sodiumMg: number;
  cholesterolMg: number;
  saturatedFatG: number;
  potassiumMg: number;
  caffeineMg: number;
  electrolytesMg: number;
  vitaminAMcg: number;
  vitaminCMg: number;
  vitaminDMcg: number;
  vitaminEMg: number;
  vitaminKMcg: number;
  thiaminMg: number;
  riboflavinMg: number;
  niacinMg: number;
  vitaminB6Mg: number;
  vitaminB12Mcg: number;
  folateMcg: number;
  zincMg: number;
  calciumMg: number;
  ironMg: number;
  magnesiumMg: number;
  thumbnailUrl: string | null;
}

export interface FoodEntryInput {
  foodName: string;
  brandName?: string;
  mealType: string;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  addedSugarG?: number;
  sodiumMg?: number;
  cholesterolMg?: number;
  saturatedFatG?: number;
  potassiumMg?: number;
  caffeineMg?: number;
  electrolytesMg?: number;
  vitaminAMcg?: number;
  vitaminCMg?: number;
  vitaminDMcg?: number;
  vitaminEMg?: number;
  vitaminKMcg?: number;
  thiaminMg?: number;
  riboflavinMg?: number;
  niacinMg?: number;
  vitaminB6Mg?: number;
  vitaminB12Mcg?: number;
  folateMcg?: number;
  zincMg?: number;
  calciumMg?: number;
  ironMg?: number;
  magnesiumMg?: number;
  thumbnailUrl?: string;
}

export interface FoodSearchResult {
  foodName: string;
  brandName: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  addedSugarG: number;
  sodiumMg: number;
  cholesterolMg: number;
  saturatedFatG: number;
  potassiumMg: number;
  caffeineMg: number;
  electrolytesMg: number;
  vitaminAMcg: number;
  vitaminCMg: number;
  vitaminDMcg: number;
  vitaminEMg: number;
  vitaminKMcg: number;
  thiaminMg: number;
  riboflavinMg: number;
  niacinMg: number;
  vitaminB6Mg: number;
  vitaminB12Mcg: number;
  folateMcg: number;
  zincMg: number;
  calciumMg: number;
  ironMg: number;
  magnesiumMg: number;
  thumbnailUrl: string | null;
}

export interface FoodSearchPage {
  currentPage: number;
  totalPages: number;
  totalHits: number;
  foods: FoodSearchResult[];
}

export interface MacroTrendPoint {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const MEAL_TYPES: string[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
