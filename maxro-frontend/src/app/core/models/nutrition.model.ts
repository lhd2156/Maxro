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
  totalSodiumMg: number;
  totalCholesterolMg: number;
  totalSaturatedFatG: number;
  totalPotassiumMg: number;
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
  sodiumMg: number;
  cholesterolMg: number;
  saturatedFatG: number;
  potassiumMg: number;
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
  sodiumMg?: number;
  cholesterolMg?: number;
  saturatedFatG?: number;
  potassiumMg?: number;
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
  sodiumMg: number;
  cholesterolMg: number;
  saturatedFatG: number;
  potassiumMg: number;
  thumbnailUrl: string | null;
}

export interface MacroTrendPoint {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const MEAL_TYPES: string[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
