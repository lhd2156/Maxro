import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { FoodEntryInput, FoodSearchPage, NutritionLog } from '../models/nutrition.model';

const NUTRITION_FIELDS = `
  id userId date
  totalCalories totalProteinG totalCarbsG totalFatG
  totalFiberG totalSugarG totalSodiumMg totalCholesterolMg totalSaturatedFatG totalPotassiumMg
  totalVitaminAMcg totalVitaminCMg totalVitaminDMcg totalCalciumMg totalIronMg totalMagnesiumMg
  entries {
    id foodName brandName mealType servingQty servingUnit
    calories proteinG carbsG fatG
    fiberG sugarG sodiumMg cholesterolMg saturatedFatG potassiumMg
    vitaminAMcg vitaminCMg vitaminDMcg calciumMg ironMg magnesiumMg
    thumbnailUrl
  }
`;

const FOOD_SEARCH_RESULT_FIELDS = `
  foodName brandName servingQty servingUnit
  calories proteinG carbsG fatG
  fiberG sugarG sodiumMg cholesterolMg saturatedFatG potassiumMg
  vitaminAMcg vitaminCMg vitaminDMcg calciumMg ironMg magnesiumMg
  thumbnailUrl
`;

const SEARCH_FOOD = gql`
  query SearchFood($query: String!, $page: Int!, $size: Int!) {
    searchFood(query: $query, page: $page, size: $size) {
      currentPage
      totalPages
      totalHits
      foods {
        ${FOOD_SEARCH_RESULT_FIELDS}
      }
    }
  }
`;

const GET_NUTRITION_LOG = gql`
  query GetNutritionLog($date: String!) {
    getNutritionLog(date: $date) { ${NUTRITION_FIELDS} }
  }
`;

const GET_NUTRITION_LOGS = gql`
  query GetNutritionLogs($startDate: String!, $endDate: String!) {
    getNutritionLogs(startDate: $startDate, endDate: $endDate) { ${NUTRITION_FIELDS} }
  }
`;

const ADD_FOOD_ENTRY = gql`
  mutation AddFoodEntry($date: String!, $input: FoodEntryInput!) {
    addFoodEntry(date: $date, input: $input) { ${NUTRITION_FIELDS} }
  }
`;

const REMOVE_FOOD_ENTRY = gql`
  mutation RemoveFoodEntry($date: String!, $entryId: ID!) {
    removeFoodEntry(date: $date, entryId: $entryId) { ${NUTRITION_FIELDS} }
  }
`;

@Injectable({ providedIn: 'root' })
export class NutritionService {
  constructor(private readonly apollo: Apollo) {}

  searchFood(query: string, page = 1, size = 5): Observable<FoodSearchPage> {
    return this.apollo.query<{ searchFood: FoodSearchPage }>({
      query: SEARCH_FOOD,
      variables: { query, page, size },
      fetchPolicy: 'no-cache',
    }).pipe(map(r => r.data.searchFood));
  }

  getNutritionLog(date: string): Observable<NutritionLog | null> {
    return this.apollo.query<{ getNutritionLog: NutritionLog | null }>({
      query: GET_NUTRITION_LOG,
      variables: { date },
    }).pipe(map(r => r.data.getNutritionLog));
  }

  getNutritionLogs(startDate: string, endDate: string): Observable<NutritionLog[]> {
    return this.apollo.query<{ getNutritionLogs: NutritionLog[] }>({
      query: GET_NUTRITION_LOGS,
      variables: { startDate, endDate },
    }).pipe(map(r => r.data.getNutritionLogs));
  }

  addFoodEntry(date: string, input: FoodEntryInput): Observable<NutritionLog> {
    return this.apollo.mutate<{ addFoodEntry: NutritionLog }>({
      mutation: ADD_FOOD_ENTRY,
      variables: { date, input },
    }).pipe(map(r => r.data!.addFoodEntry));
  }

  removeFoodEntry(date: string, entryId: string): Observable<NutritionLog> {
    return this.apollo.mutate<{ removeFoodEntry: NutritionLog }>({
      mutation: REMOVE_FOOD_ENTRY,
      variables: { date, entryId },
    }).pipe(map(r => r.data!.removeFoodEntry));
  }
}
