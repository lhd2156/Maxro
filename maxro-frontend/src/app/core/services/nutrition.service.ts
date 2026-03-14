import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { FoodEntryInput, FoodSearchPage, NutritionLog } from '../models/nutrition.model';
import { environment } from '../../../environments/environment';

const NUTRITION_FIELDS = `
  id userId date
  totalCalories totalProteinG totalCarbsG totalFatG
  totalFiberG totalSugarG totalAddedSugarG totalSodiumMg totalCholesterolMg totalSaturatedFatG totalPotassiumMg totalCaffeineMg totalElectrolytesMg
  totalVitaminAMcg totalVitaminCMg totalVitaminDMcg totalVitaminEMg totalVitaminKMcg totalThiaminMg totalRiboflavinMg totalNiacinMg totalVitaminB6Mg totalVitaminB12Mcg totalFolateMcg totalZincMg totalCalciumMg totalIronMg totalMagnesiumMg
  entries {
    id foodName brandName mealType servingQty servingUnit
    calories proteinG carbsG fatG
    fiberG sugarG addedSugarG sodiumMg cholesterolMg saturatedFatG potassiumMg caffeineMg electrolytesMg
    vitaminAMcg vitaminCMg vitaminDMcg vitaminEMg vitaminKMcg thiaminMg riboflavinMg niacinMg vitaminB6Mg vitaminB12Mcg folateMcg zincMg calciumMg ironMg magnesiumMg
    thumbnailUrl
  }
`;

const FOOD_SEARCH_RESULT_FIELDS = `
  foodName brandName servingQty servingUnit
  calories proteinG carbsG fatG
  fiberG sugarG addedSugarG sodiumMg cholesterolMg saturatedFatG potassiumMg caffeineMg electrolytesMg
  vitaminAMcg vitaminCMg vitaminDMcg vitaminEMg vitaminKMcg thiaminMg riboflavinMg niacinMg vitaminB6Mg vitaminB12Mcg folateMcg zincMg calciumMg ironMg magnesiumMg
  thumbnailUrl
`;

const SEARCH_FOOD_TEXT = `
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

const SEARCH_FOOD = gql`${SEARCH_FOOD_TEXT}`;

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
  constructor(private readonly apollo: Apollo, private readonly http: HttpClient) {}

  searchFood(query: string, page = 1, size = 5): Observable<FoodSearchPage> {
    return this.searchFoodWithFallback(query, page, size);
  }

  private searchFoodWithFallback(query: string, page: number, size: number): Observable<FoodSearchPage> {
    return this.apollo.query<{ searchFood: FoodSearchPage }>({
      query: SEARCH_FOOD,
      variables: { query, page, size },
      fetchPolicy: 'no-cache',
    }).pipe(
      map(r => r.data.searchFood),
      catchError(() => this.searchFoodDirectFallback(query, page, size)),
    );
  }

  private searchFoodDirectFallback(query: string, page: number, size: number): Observable<FoodSearchPage> {
    if (!this.shouldUseDirectLocalFallback()) {
      return of({ currentPage: Math.max(page, 1), totalPages: 1, totalHits: 0, foods: [] });
    }

    const token = localStorage.getItem('accessToken');
    const headers = token
      ? new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ data?: { searchFood?: FoodSearchPage } }>('http://localhost:8080/graphql', {
      query: SEARCH_FOOD_TEXT,
      variables: { query, page, size },
    }, { headers }).pipe(
      map(response => response?.data?.searchFood || { currentPage: Math.max(page, 1), totalPages: 1, totalHits: 0, foods: [] }),
      catchError(() => of({ currentPage: Math.max(page, 1), totalPages: 1, totalHits: 0, foods: [] })),
    );
  }

  private shouldUseDirectLocalFallback(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const host = window.location.hostname;
    return host === '127.0.0.1' || host === 'localhost' || environment.graphqlUrl.startsWith('/');
  }

  getNutritionLog(date: string): Observable<NutritionLog | null> {
    return this.apollo.query<{ getNutritionLog: NutritionLog | null }>({
      query: GET_NUTRITION_LOG,
      variables: { date },
      fetchPolicy: 'network-only',
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
