import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, retry, Subject, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ConfettiService } from '../../../core/services/confetti.service';
import { FoodEntryInput, FoodSearchPage, FoodSearchResult, MEAL_TYPES, NutritionLog } from '../../../core/models/nutrition.model';
import { NutritionService } from '../../../core/services/nutrition.service';
import { UserProfile } from '../../../core/models/user.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { MacroBarComponent } from '../../../shared/components/macro-bar/macro-bar.component';
import { NumericInputDirective } from '../../../shared/directives/numeric-input.directive';

const FOOD_SERVING_UNITS = [
  'serving', 'item', 'piece', 'slice', 'cup', 'tbsp', 'tsp',
  'fl oz', 'ml', 'l', 'g', 'kg', 'oz', 'lb',
  'pinch', 'dash', 'drop', 'sprig', 'leaf',
  'clove', 'stalk', 'bunch', 'can', 'bottle', 'jar', 'box', 'package', 'packet',
  'pouch', 'bag', 'bar', 'wrap', 'roll',
  'bowl', 'plate', 'tray',
  'cookie', 'cracker', 'chip', 'nugget', 'strip', 'wing',
  'fillet', 'patty', 'sausage',
  'egg', 'fruit', 'vegetable',
  'scoop', 'ladle', 'handful',
  'shot', 'glass', 'mug',
] as const;

@Component({
  selector: 'app-nutrition-log',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatButtonModule, MatCardModule, MatNativeDateModule, MatDatepickerModule,
    MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatTooltipModule,
    LoadingSpinnerComponent, MacroBarComponent, NumericInputDirective,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Nutrition</h1>
        <div class="header-right">
          <div class="date-nav">
            <button mat-icon-button (click)="prevDay()"><mat-icon svgIcon="mx-chevron-left"></mat-icon></button>
            <span class="current-date">{{ currentDate | date:'EEE, MMM d' }}</span>
            <button mat-icon-button (click)="nextDay()"><mat-icon svgIcon="mx-chevron-right"></mat-icon></button>
            <button mat-icon-button class="calendar-btn" (click)="nutritionDatePicker.open()" matTooltip="Pick date"><mat-icon svgIcon="mx-calendar"></mat-icon></button>
            <input [matDatepicker]="nutritionDatePicker" [ngModel]="currentDate" (ngModelChange)="onDateChange($event)" class="date-picker-input" readonly>
            <mat-datepicker #nutritionDatePicker></mat-datepicker>
          </div>
          <button mat-flat-button class="add-food-trigger" (click)="openAddFood()"><mat-icon svgIcon="mx-plus"></mat-icon>Add Food</button>
        </div>
      </div>

      <div class="top-row">
        <mat-card class="card">
          <div class="macro-bars">
            <app-macro-bar label="Calories" [current]="log?.totalCalories || 0" [goal]="user?.dailyCalorieTarget || 2000" unit=" kcal" />
            <app-macro-bar label="Protein" [current]="log?.totalProteinG || 0" [goal]="user?.dailyProteinTarget || 150" />
            <app-macro-bar label="Carbs" [current]="log?.totalCarbsG || 0" [goal]="user?.dailyCarbTarget || 250" />
            <app-macro-bar label="Fat" [current]="log?.totalFatG || 0" [goal]="user?.dailyFatTarget || 65" />
          </div>
          <div class="nutrition-pie-wrap"
            [style.--p-pct]="nutritionProteinPct + '%'"
            [style.--c-pct]="nutritionCarbsPct + '%'"
            [style.--f-pct]="nutritionFatPct + '%'">
            <div class="nutrition-pie-wrapper">
              <div class="nutrition-pie-donut"></div>
              <div class="nutrition-pie-hole">
                <span class="nutrition-pie-cal">{{ formatCalories(log?.totalCalories) }}</span>
                <span class="nutrition-pie-unit">cal</span>
              </div>
            </div>
          </div>
        </mat-card>

        <mat-card class="card">
          <div class="micro-grid">
            <div class="micro-pill"><span>Fiber</span><strong>{{ formatAmount(log?.totalFiberG, 'g', 1) }}</strong></div>
            <div class="micro-pill"><span>Sugar</span><strong>{{ formatAmount(log?.totalSugarG, 'g', 1) }}</strong></div>
            <div class="micro-pill"><span>Added Sugar</span><strong>{{ formatAmount(log?.totalAddedSugarG, 'g', 1) }}</strong></div>
            <div class="micro-pill"><span>Sat. Fat</span><strong>{{ formatAmount(log?.totalSaturatedFatG, 'g', 1) }}</strong></div>
            <div class="micro-pill"><span>Sodium</span><strong>{{ formatAmount(log?.totalSodiumMg, 'mg') }}</strong></div>
            <div class="micro-pill"><span>Cholesterol</span><strong>{{ formatAmount(log?.totalCholesterolMg, 'mg') }}</strong></div>
            <div class="micro-pill"><span>Iron</span><strong>{{ formatAmount(log?.totalIronMg, 'mg', 1) }}</strong></div>
            <div class="micro-pill"><span>Potassium</span><strong>{{ formatAmount(log?.totalPotassiumMg, 'mg') }}</strong></div>
            <div class="micro-pill"><span>Caffeine</span><strong>{{ formatAmount(log?.totalCaffeineMg, 'mg') }}</strong></div>
            <div class="micro-pill"><span>Electrolytes</span><strong>{{ formatAmount(log?.totalElectrolytesMg, 'mg') }}</strong></div>
          </div>
          <p class="micro-label">All tracked vitamins</p>
          <div class="micro-grid vitamins">
            <div class="micro-pill"><span>Vitamin A</span><strong>{{ formatAmount(log?.totalVitaminAMcg, 'mcg') }}</strong></div>
            <div class="micro-pill"><span>Vitamin C</span><strong>{{ formatAmount(log?.totalVitaminCMg, 'mg') }}</strong></div>
            <div class="micro-pill"><span>Vitamin D</span><strong>{{ formatAmount(log?.totalVitaminDMcg, 'mcg') }}</strong></div>
            <div class="micro-pill"><span>Vitamin E</span><strong>{{ formatAmount(log?.totalVitaminEMg, 'mg', 1) }}</strong></div>
            <div class="micro-pill"><span>Vitamin K</span><strong>{{ formatAmount(log?.totalVitaminKMcg, 'mcg') }}</strong></div>
            <div class="micro-pill"><span>Vitamin B6</span><strong>{{ formatAmount(log?.totalVitaminB6Mg, 'mg', 1) }}</strong></div>
            <div class="micro-pill"><span>Vitamin B12</span><strong>{{ formatAmount(log?.totalVitaminB12Mcg, 'mcg', 1) }}</strong></div>
            <div class="micro-pill"><span>Vitamin B1</span><strong>{{ formatAmount(log?.totalThiaminMg, 'mg', 2) }}</strong></div>
            <div class="micro-pill"><span>Vitamin B2</span><strong>{{ formatAmount(log?.totalRiboflavinMg, 'mg', 2) }}</strong></div>
            <div class="micro-pill"><span>Vitamin B3</span><strong>{{ formatAmount(log?.totalNiacinMg, 'mg', 2) }}</strong></div>
            <div class="micro-pill"><span>Vitamin B9</span><strong>{{ formatAmount(log?.totalFolateMcg, 'mcg') }}</strong></div>
          </div>
        </mat-card>
      </div>

      <mat-card class="card entries-card">
        @for (mealType of mealTypes; track mealType) {
          <div class="meal-group">
            <span class="meal-label">{{ mealType }}</span>
            @if (getEntriesByMeal(mealType).length > 0) {
              @for (entry of getEntriesByMeal(mealType); track entry.id) {
                <div class="entry-row">
                  <div class="entry-info">
                    <span class="entry-name">{{ entry.foodName }}</span>
                    <span class="entry-serving">{{ formatServing(entry.servingQty, entry.servingUnit) }}</span>
                  </div>
                  <div class="entry-macros">
                    <span class="protein">{{ entry.proteinG | number:'1.0-0' }}P</span>
                    <span class="carbs">{{ entry.carbsG | number:'1.0-0' }}C</span>
                    <span class="fat">{{ entry.fatG | number:'1.0-0' }}F</span>
                  </div>
                  <span class="entry-cal">{{ formatCalories(entry.calories) }} cal</span>
                  <button mat-stroked-button type="button" class="serving-edit-btn" (click)="openServingEditor(entry)">Servings</button>
                  <button mat-icon-button class="remove-btn" (click)="removeEntry(entry.id)" aria-label="Remove entry"><span class="remove-btn-glyph" aria-hidden="true">&times;</span></button>
                </div>
                @if (editingEntryId === entry.id) {
                  <div class="entry-serving-editor">
                    <mat-form-field appearance="outline" class="serving-editor-field">
                      <mat-label>Serving Qty</mat-label>
                      <input matInput appNumericInput="decimal" [(ngModel)]="editingServingQty" [ngModelOptions]="{ standalone: true }">
                    </mat-form-field>
                    <button mat-flat-button type="button" class="serving-save-btn" (click)="saveServingEditor(entry)">Save</button>
                    <button mat-stroked-button type="button" class="serving-cancel-btn" (click)="cancelServingEditor()">Cancel</button>
                  </div>
                }
              }
            } @else {
              <div class="meal-empty">
                <span>No {{ mealType | lowercase }} logged yet</span>
                <button mat-stroked-button class="meal-add-btn" (click)="openAddFoodForMeal(mealType)">Add</button>
              </div>
            }
          </div>
        }
      </mat-card>
    </div>

    @if (addFoodOpen) {
      <div class="modal-backdrop" [class.closing]="addFoodClosing" (click)="closeAddFood()">
        <div class="modal-panel" [class.closing]="addFoodClosing" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add Food</h2>
            <button type="button" class="modal-close" aria-label="Close add food" (click)="closeAddFood()"><mat-icon svgIcon="mx-x"></mat-icon></button>
          </div>
          <div class="modal-tabs">
            <button type="button" class="tab-btn" [class.active]="activeTab === 'search'" (click)="activeTab = 'search'">Search</button>
            <button type="button" class="tab-btn" [class.active]="activeTab === 'custom'" (click)="activeTab = 'custom'">Custom</button>
          </div>
          <div class="modal-body">
            <div class="meal-picker">
              <span class="meal-picker-label">Meal</span>
              <div class="meal-chip-row" role="tablist" aria-label="Choose meal">
                @for (meal of mealTypes; track meal) {
                  <button type="button" class="meal-chip" [class.active]="selectedMealType === meal" (click)="selectMeal(meal)">{{ meal }}</button>
                }
              </div>
            </div>

            <div class="modal-content-pane">
            @if (activeTab === 'search') {
              <div class="search-shell">
                <div class="search-field-modal">
                  <label class="search-field-label" for="foodSearchInput">Search food (e.g. "chicken breast")</label>
                  <div class="search-input-wrap">
                    <input id="foodSearchInput" class="search-input" [value]="searchQuery" (input)="onSearchInput($event)" (keydown.enter)="onSearchEnter($event)" autocomplete="off" placeholder="Start typing a food or chain item">
                    <button type="button" class="search-icon-btn" (click)="triggerSearchNow()" aria-label="Search food"><mat-icon svgIcon="mx-search" class="search-input-icon"></mat-icon></button>
                  </div>
                </div>

                @if (searchLoading) {
                  <div class="state-box"><app-loading-spinner /></div>
                } @else if (searchError) {
                  <div class="state-box state-box-error">
                    <p>{{ searchError }}</p>
                    <button mat-stroked-button type="button" class="state-retry-btn" (click)="retryFoodSearch()">Retry Search</button>
                  </div>
                } @else if (searchQuery.trim().length < 2) {
                  <div class="state-box"><p>Type at least 2 characters and we'll show the 5 best matches.</p></div>
                } @else if (searchResults.length > 0) {
                  <div class="results" [class.no-scroll]="expandedIdx === null">
                    @for (food of searchResults; track food.foodName + '-' + (food.brandName || 'unbranded'); let idx = $index) {
                      <div class="result" [class.expanded]="expandedIdx === idx">
                        <div class="result-main" (click)="selectFoodCard(food, idx)">
                          <div class="result-badge">{{ resultMonogram(food) }}</div>
                          <div class="result-copy">
                            <span class="result-name">{{ displayFoodName(food) }}</span>
                            @if (displayFoodContext(food)) {
                              <span class="result-helper">{{ displayFoodContext(food) }}</span>
                            }
                            <span class="result-meta">{{ formatServing(food.servingQty, food.servingUnit) }}</span>
                          </div>
                          <span class="cal-badge">{{ formatCalories(food.calories) }} cal</span>
                          <button mat-flat-button class="add-btn" (click)="addFood(food); $event.stopPropagation()">Add</button>
                        </div>
                        @if (expandedIdx === idx) {
                          <div class="result-detail-inline">
                            <div class="result-detail-inline-scroll">
                              <div class="detail-grid">
                                <div><span>Protein</span><strong>{{ formatAmount(food.proteinG, 'g', 1) }}</strong></div>
                                <div><span>Carbs</span><strong>{{ formatAmount(food.carbsG, 'g', 1) }}</strong></div>
                                <div><span>Fat</span><strong>{{ formatAmount(food.fatG, 'g', 1) }}</strong></div>
                                <div><span>Fiber</span><strong>{{ formatAmount(food.fiberG, 'g', 1) }}</strong></div>
                                <div><span>Sugar</span><strong>{{ formatAmount(food.sugarG, 'g', 1) }}</strong></div>
                                <div><span>Added Sugar</span><strong>{{ formatAmount(food.addedSugarG, 'g', 1) }}</strong></div>
                                <div><span>Sat. Fat</span><strong>{{ formatAmount(food.saturatedFatG, 'g', 1) }}</strong></div>
                                <div><span>Sodium</span><strong>{{ formatAmount(food.sodiumMg, 'mg') }}</strong></div>
                                <div><span>Cholesterol</span><strong>{{ formatAmount(food.cholesterolMg, 'mg') }}</strong></div>
                                <div><span>Iron</span><strong>{{ formatAmount(food.ironMg, 'mg', 1) }}</strong></div>
                                <div><span>Potassium</span><strong>{{ formatAmount(food.potassiumMg, 'mg') }}</strong></div>
                                <div><span>Caffeine</span><strong>{{ formatAmount(food.caffeineMg, 'mg') }}</strong></div>
                                <div><span>Electrolytes</span><strong>{{ formatAmount(estimateElectrolytesMg(food), 'mg') }}</strong></div>
                                <div><span>Vitamin A</span><strong>{{ formatAmount(food.vitaminAMcg, 'mcg') }}</strong></div>
                                <div><span>Vitamin C</span><strong>{{ formatAmount(food.vitaminCMg, 'mg') }}</strong></div>
                                <div><span>Vitamin D</span><strong>{{ formatAmount(food.vitaminDMcg, 'mcg') }}</strong></div>
                                <div><span>Vitamin E</span><strong>{{ formatAmount(food.vitaminEMg, 'mg', 1) }}</strong></div>
                                <div><span>Vitamin K</span><strong>{{ formatAmount(food.vitaminKMcg, 'mcg') }}</strong></div>
                                <div><span>Vitamin B6</span><strong>{{ formatAmount(food.vitaminB6Mg, 'mg', 2) }}</strong></div>
                                <div><span>Vitamin B12</span><strong>{{ formatAmount(food.vitaminB12Mcg, 'mcg', 1) }}</strong></div>
                                <div><span>Vitamin B1</span><strong>{{ formatAmount(food.thiaminMg, 'mg', 2) }}</strong></div>
                                <div><span>Vitamin B2</span><strong>{{ formatAmount(food.riboflavinMg, 'mg', 2) }}</strong></div>
                                <div><span>Vitamin B3</span><strong>{{ formatAmount(food.niacinMg, 'mg', 2) }}</strong></div>
                                <div><span>Vitamin B9</span><strong>{{ formatAmount(food.folateMcg, 'mcg') }}</strong></div>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <div class="state-box"><p>{{ noResultsMessage }}</p></div>
                }

                @if (searchPage && searchPage.totalHits > 0) {
                  <div class="search-pagination">
                    <span class="pagination-summary">{{ searchSummary }}</span>
                    <div class="pagination-controls">
                      <button type="button" class="pager" [disabled]="!canGoToPreviousPage" (click)="goToSearchPage(searchPage.currentPage - 1)">&lt;</button>
                      <div class="page-picker-wrap">
                        <button type="button" class="page-pill page-pill-btn" [class.open]="pagePickerOpen" (click)="toggleSearchPagePicker()">Page {{ searchPage.currentPage }} of {{ searchPage.totalPages }}</button>
                        @if (pagePickerOpen && searchPage) {
                          <div class="page-picker-panel" (click)="$event.stopPropagation()">
                            <div class="page-picker-header">
                              <span>Jump to page</span>
                              <button type="button" class="page-picker-close" (click)="closeSearchPagePicker()" aria-label="Close page picker">x</button>
                            </div>
                            <span class="page-picker-range">Choose any page from 1 to {{ searchPage.totalPages }}</span>
                            <div class="page-picker-quick-list">
                              @for (page of pagePickerOptions; track page) {
                                <button type="button" class="page-picker-option" [class.active]="searchPage.currentPage === page" (click)="goToSearchPage(page)">{{ page }}</button>
                              }
                            </div>
                            <form class="page-picker-input-row" (submit)="submitSearchPagePicker(); $event.preventDefault()">
                              <input class="page-picker-input" type="number" min="1" [max]="searchPage.totalPages" [(ngModel)]="searchPageDraft" [ngModelOptions]="{ standalone: true }">
                              <button type="submit" class="page-picker-go">Go</button>
                            </form>
                          </div>
                        }
                      </div>
                      <button type="button" class="pager" [disabled]="!canGoToNextPage" (click)="goToSearchPage(searchPage.currentPage + 1)">&gt;</button>
                    </div>
                  </div>
                }

              </div>
            } @else {
              <form [formGroup]="customForm" (ngSubmit)="addCustomFood()" class="custom-form" [class.allow-scroll]="advancedOptionsOpen">
                <mat-form-field appearance="outline"><mat-label>Food Name</mat-label><input matInput formControlName="foodName"></mat-form-field>
                <div class="custom-row">
                  <mat-form-field appearance="outline"><mat-label>Serving Qty</mat-label><input matInput formControlName="servingQty" appNumericInput="decimal"></mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Unit</mat-label>
                    <mat-select formControlName="servingUnit" panelClass="food-unit-select-panel">
                      @for (unit of servingUnitOptions; track unit) {
                        <mat-option [value]="unit">{{ unit }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Calories</mat-label><input matInput formControlName="calories" appNumericInput="decimal"></mat-form-field>
                </div>
                <div class="custom-row">
                  <mat-form-field appearance="outline"><mat-label>Protein (g)</mat-label><input matInput formControlName="proteinG" appNumericInput="decimal"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Carbs (g)</mat-label><input matInput formControlName="carbsG" appNumericInput="decimal"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Fat (g)</mat-label><input matInput formControlName="fatG" appNumericInput="decimal"></mat-form-field>
                </div>
                <button type="button" class="advanced-toggle" (click)="advancedOptionsOpen = !advancedOptionsOpen">
                  <mat-icon svgIcon="mx-chevron-down" [class.open]="advancedOptionsOpen"></mat-icon>
                  <span>Advanced options</span>
                </button>
                @if (advancedOptionsOpen) {
                  <div class="advanced-grid">
                    <mat-form-field appearance="outline"><mat-label>Fiber (g)</mat-label><input matInput formControlName="fiberG" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Sugar (g)</mat-label><input matInput formControlName="sugarG" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Added Sugar (g)</mat-label><input matInput formControlName="addedSugarG" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Sat. Fat (g)</mat-label><input matInput formControlName="saturatedFatG" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Sodium (mg)</mat-label><input matInput formControlName="sodiumMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Cholesterol (mg)</mat-label><input matInput formControlName="cholesterolMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Iron (mg)</mat-label><input matInput formControlName="ironMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Potassium (mg)</mat-label><input matInput formControlName="potassiumMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Caffeine (mg)</mat-label><input matInput formControlName="caffeineMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Electrolytes (mg)</mat-label><input matInput formControlName="electrolytesMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Vitamin A (mcg)</mat-label><input matInput formControlName="vitaminAMcg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Vitamin C (mg)</mat-label><input matInput formControlName="vitaminCMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Vitamin D (mcg)</mat-label><input matInput formControlName="vitaminDMcg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Vitamin E (mg)</mat-label><input matInput formControlName="vitaminEMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Vitamin K (mcg)</mat-label><input matInput formControlName="vitaminKMcg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Vitamin B6 (mg)</mat-label><input matInput formControlName="vitaminB6Mg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Vitamin B12 (mcg)</mat-label><input matInput formControlName="vitaminB12Mcg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Thiamin (mg)</mat-label><input matInput formControlName="thiaminMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Riboflavin (mg)</mat-label><input matInput formControlName="riboflavinMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Niacin (mg)</mat-label><input matInput formControlName="niacinMg" appNumericInput="decimal"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Folate (mcg)</mat-label><input matInput formControlName="folateMcg" appNumericInput="decimal"></mat-form-field>
                  </div>
                }
                <button mat-flat-button class="submit-custom" type="submit" [disabled]="customForm.invalid">Add Custom Food</button>
              </form>
            }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host{display:block;height:100%;min-height:0;overflow-y:auto;overflow-x:hidden}.page{max-width:860px;height:auto;min-height:100%;margin:0 auto;display:flex;flex-direction:column;gap:12px;overflow:visible;padding-bottom:12px}.page-header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-shrink:0}.header-right,.date-nav{display:flex;align-items:center;gap:8px}.current-date{min-width:108px;text-align:center;font-size:14px;font-weight:600}.date-picker-input{position:absolute;width:0;height:0;opacity:0}.add-food-trigger{height:40px;padding:0 16px;border-radius:10px;background:var(--accent)!important;color:#0d0d0d!important;font-weight:700;gap:6px}.top-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;flex-shrink:0}.card{background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.01)),var(--bg-surface);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:16px}.macro-bars{display:flex;flex-direction:column;gap:10px}.nutrition-pie-wrap{margin-top:14px;display:flex;align-items:center;justify-content:center;padding:8px 0 0;min-height:220px}.nutrition-pie-wrapper{position:relative;width:min(260px,72%);max-width:260px;min-width:180px;aspect-ratio:1 / 1;flex-shrink:0}.nutrition-pie-donut{width:100%;height:100%;border-radius:50%;background:conic-gradient(from 0deg,#4fc3f7 0% var(--p-pct,0%),#c8f135 var(--p-pct,0%) var(--c-pct,0%),#ff7043 var(--c-pct,0%) var(--f-pct,100%),rgba(255,255,255,.12) var(--f-pct,100%) 100%)}.nutrition-pie-hole{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:58%;height:58%;border-radius:50%;background:var(--bg-surface);display:flex;flex-direction:column;align-items:center;justify-content:center}.nutrition-pie-cal{font-size:clamp(24px,5.4vw,44px);font-weight:800;line-height:1;letter-spacing:-.02em;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;color:#9C27B0}.nutrition-pie-unit{font-size:clamp(11px,1.2vw,14px);color:var(--text-muted);line-height:1;margin-top:2px}.micro-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.micro-pill{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.03);font-size:12px;min-height:40px;min-width:0}.micro-pill span{color:var(--text-muted);min-width:0}.micro-pill strong{white-space:nowrap;text-align:right;line-height:1.15;font-size:11px;min-width:0}.micro-label{margin:14px 0 8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}.vitamins{grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}.vitamins .micro-pill{min-height:52px;align-items:flex-start;flex-direction:column;gap:4px}.vitamins .micro-pill span{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25;font-size:11px}.vitamins .micro-pill strong{white-space:normal;line-height:1.2;overflow-wrap:anywhere}.entries-card{margin-bottom:0;padding:14px;flex:0 0 auto;min-height:0;overflow:visible;display:flex;flex-direction:column}.meal-group+.meal-group{margin-top:12px}.meal-label{display:block;margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}.entry-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.03)}.entry-row+.entry-row{margin-top:6px}.entry-info{flex:1;display:flex;flex-direction:column;min-width:0}.entry-name{font-size:13px;font-weight:600;word-break:break-word}.entry-serving,.meal-empty span{font-size:11px;color:var(--text-muted)}.entry-macros{display:flex;gap:8px;font-size:11px;font-weight:700}.entry-macros .protein{color:#4fc3f7}.entry-macros .carbs{color:#c8f135}.entry-macros .fat{color:#ff7043}.entry-cal{font-size:13px;font-weight:700;white-space:nowrap}.serving-edit-btn{height:30px;padding:0 12px;border-radius:999px;font-size:11px;font-weight:700}.entry-serving-editor{display:flex;align-items:center;gap:8px;margin-top:6px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06)}.serving-editor-field{width:120px}.serving-save-btn{height:34px;padding:0 14px;border-radius:10px;background:var(--accent)!important;color:#0d0d0d!important;font-weight:800}.serving-cancel-btn{height:34px;padding:0 14px;border-radius:10px}.remove-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:var(--text-primary)}.remove-btn-glyph{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;font-size:22px;line-height:1;font-weight:400;transform:translateY(-1px)}.remove-btn:hover{border-color:rgba(255,255,255,.24);background:rgba(255,255,255,.08)}.meal-empty{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.08)}.meal-add-btn{height:30px;padding:0 14px;border-radius:999px;font-size:12px;font-weight:700}.modal-backdrop{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.76);backdrop-filter:blur(6px)}.modal-panel{width:100%;max-width:620px;height:min(92vh,860px);max-height:min(92vh,860px);overflow:hidden;display:flex;flex-direction:column;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(20,20,20,.98),rgba(14,14,14,.98));box-shadow:0 30px 70px rgba(0,0,0,.45)}.modal-header{position:relative;display:flex;align-items:center;justify-content:space-between;padding:18px 22px 6px}.modal-header h2{margin:0;padding-right:48px}.modal-close{position:absolute;top:10px;right:12px;display:grid;place-items:center;width:40px;height:40px;padding:0;border:0;border-radius:999px;background:rgba(255,255,255,.05);color:var(--text-primary);line-height:1}.modal-close mat-icon{display:block;width:18px;height:18px;font-size:18px;line-height:18px;margin:0}.modal-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px 22px 0}.tab-btn{height:40px;border:0;border-radius:10px;background:transparent;color:var(--text-muted);font-size:13px;font-weight:700;transition:background .15s ease,color .15s ease}.tab-btn:hover{background:rgba(255,255,255,.03);color:var(--text-primary)}.tab-btn.active{background:rgba(200,241,53,.12);color:var(--accent)}.modal-body{padding:10px 22px 16px;display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}.modal-content-pane{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}.custom-form mat-form-field{width:100%}.search-field-modal{display:flex;flex-direction:column;gap:8px;margin-bottom:2px}.search-field-label{display:block;padding:0 4px;font-size:12px;font-weight:700;color:rgba(200,241,53,.92);line-height:1.2}.search-input-wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;min-height:68px;padding:0 18px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.02);transition:border-color .15s ease,box-shadow .15s ease}.search-input-wrap:focus-within{border-color:rgba(200,241,53,.58);box-shadow:0 0 0 1px rgba(200,241,53,.16)}.search-input{width:100%;border:0;outline:0;background:transparent;color:var(--text-primary);font:inherit;font-size:18px;font-weight:600;padding:0}.search-input::placeholder{color:rgba(255,255,255,.34)}.search-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border:0;border-radius:999px;background:rgba(255,255,255,.03);cursor:pointer}.search-input-icon{width:30px;height:30px;font-size:30px;color:rgba(255,255,255,.92);flex-shrink:0}.meal-picker{margin-bottom:8px;min-height:82px;display:flex;flex-direction:column;justify-content:flex-start}.meal-picker-label{display:block;margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted)}.meal-chip-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.meal-chip{width:100%;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:var(--text-muted);font-size:12px;font-weight:700;cursor:pointer;justify-content:center;transition:border-color .15s ease,background .15s ease,color .15s ease}.meal-chip:hover{border-color:rgba(200,241,53,.28);color:var(--text-primary)}.meal-chip.active{border-color:rgba(200,241,53,.4);background:rgba(200,241,53,.14);color:var(--accent);box-shadow:inset 0 0 0 1px rgba(200,241,53,.08)}.search-shell{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;max-height:none;overflow:hidden}.search-selected-card{border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);padding:10px;flex-shrink:0}.search-selected-scroll{max-height:230px;overflow:auto;padding-right:4px}.results{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;overflow:auto;padding-right:4px}.results.no-scroll{overflow:hidden}.state-box{flex:1;min-height:190px;border-radius:14px;border:1px dashed rgba(255,255,255,.08);background:rgba(255,255,255,.02);display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;color:var(--text-muted)}.state-box-error{flex-direction:column;gap:10px}.state-retry-btn{border-radius:10px}.result{position:relative;border-radius:14px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);overflow:visible}.result.expanded{z-index:7;border-color:rgba(200,241,53,.35);box-shadow:inset 0 0 0 1px rgba(200,241,53,.12)}.result-main{display:grid;grid-template-columns:44px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:9px 12px;cursor:pointer;min-height:62px}.result-badge{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(200,241,53,.18),rgba(200,241,53,.05));color:var(--accent);font-size:16px;font-weight:800;letter-spacing:.06em}.result-copy{display:flex;flex-direction:column;min-width:0}.result-name{font-size:14px;font-weight:700;line-height:1.24;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.result-helper{font-size:10.5px;color:var(--accent)}.result-meta{font-size:11px;color:var(--text-muted)}.cal-badge{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:0 9px;border-radius:999px;background:rgba(200,241,53,.1);color:var(--accent);font-size:11px;font-weight:800;white-space:nowrap}.add-btn,.submit-custom{border-radius:10px;background:var(--accent)!important;color:#0d0d0d!important;font-weight:800}.add-btn{min-width:60px;height:34px;font-size:13px}.result-detail-inline{position:static;margin-top:8px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(20,20,20,.98),rgba(14,14,14,.98));box-shadow:0 14px 28px rgba(0,0,0,.35);padding:10px;z-index:9}.result-detail-inline-scroll{max-height:230px;overflow:auto;padding-right:4px}.detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.detail-grid div{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.03);font-size:11px}.detail-grid span{color:var(--text-muted)}.search-pagination{position:sticky;bottom:0;z-index:24;margin-top:4px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 0;background:linear-gradient(180deg,rgba(14,14,14,0),rgba(14,14,14,0.94) 24%,rgba(14,14,14,0.98) 100%)}.pagination-summary{font-size:12px;color:var(--text-muted)}.pagination-controls{display:inline-flex;align-items:center;gap:10px;position:relative}.pager{width:38px;height:38px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(255,255,255,.03);color:var(--text-primary);font-size:18px;font-weight:700}.pager:disabled{opacity:.35}.page-picker-wrap{position:relative;z-index:25}.page-pill{min-width:116px;text-align:center;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.04);font-size:12px;font-weight:700}.page-pill-btn{border:0;color:var(--text-primary);cursor:pointer}.page-pill-btn:hover,.page-pill-btn.open{background:rgba(200,241,53,.1);color:var(--accent)}.page-picker-panel{position:absolute;right:0;left:auto;bottom:calc(100% + 10px);transform:none;z-index:30;width:min(260px,calc(100vw - 88px));padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(20,20,20,.98),rgba(14,14,14,.98));box-shadow:0 20px 50px rgba(0,0,0,.38);display:flex;flex-direction:column;gap:12px}.page-picker-header{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;font-weight:700;color:var(--text-primary)}.page-picker-close{width:28px;height:28px;border:0;border-radius:999px;background:rgba(255,255,255,.05);color:var(--text-primary);font-size:18px;cursor:pointer}.page-picker-range{font-size:11px;color:var(--text-muted)}.page-picker-quick-list{display:flex;flex-wrap:wrap;gap:8px}.page-picker-option{min-width:42px;height:34px;padding:0 10px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(255,255,255,.03);color:var(--text-primary);font-size:12px;font-weight:700;cursor:pointer}.page-picker-option.active,.page-picker-option:hover{border-color:rgba(200,241,53,.3);background:rgba(200,241,53,.12);color:var(--accent)}.page-picker-input-row{display:flex;align-items:center;gap:8px}.page-picker-input{flex:1;min-width:0;height:40px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:var(--text-primary);font-size:14px}.page-picker-go{height:40px;padding:0 14px;border:0;border-radius:12px;background:var(--accent);color:#0d0d0d;font-size:12px;font-weight:800;cursor:pointer}.custom-form{display:flex;flex-direction:column;gap:8px;min-height:0;overflow:hidden}.custom-form.allow-scroll{overflow:auto;padding-right:4px;scrollbar-gutter:stable}.custom-row,.advanced-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.advanced-toggle{width:100%;display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:var(--text-primary)}.advanced-toggle .open{transform:rotate(180deg)}.advanced-grid{margin-top:6px}.submit-custom{display:block;width:100%;align-self:stretch;flex:0 0 auto;height:44px;margin-top:4px}@media(max-width:920px){.top-row{grid-template-columns:1fr}.result-main{grid-template-columns:46px minmax(0,1fr)}.cal-badge,.add-btn{grid-column:2;justify-self:start}.result-main .add-btn{margin-left:auto}.detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.vitamins{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))}}@media(max-width:760px){.page{gap:10px;padding-bottom:10px}.card{padding:12px}.page-header{flex-direction:column;align-items:flex-start}.header-right,.micro-grid,.custom-row,.advanced-grid,.detail-grid{width:100%;grid-template-columns:1fr}.nutrition-pie-wrap{min-height:164px;margin-top:8px;padding-top:2px}.nutrition-pie-wrapper{width:min(188px,66vw);min-width:132px}.micro-pill{padding:8px 10px;min-height:34px;font-size:11px}.micro-pill strong{font-size:10px}.vitamins{grid-template-columns:repeat(2,minmax(0,1fr))}.search-pagination{flex-direction:column;align-items:stretch}.pagination-controls{justify-content:center}.page-picker-panel{left:50%;right:auto;transform:translateX(-50%);width:min(260px,calc(100vw - 72px))}}@media(max-width:560px){.current-date{font-size:13px;min-width:96px}.add-food-trigger{height:36px}.entry-row,.meal-empty{flex-wrap:wrap}.entry-cal{font-size:12px}.entry-macros{gap:6px}.modal-backdrop{padding:12px}.modal-header,.modal-tabs,.modal-body{padding-left:16px;padding-right:16px}.meal-chip-row{width:100%;grid-template-columns:repeat(2,minmax(0,1fr))}.meal-chip{justify-content:center}.add-food-trigger{width:100%;justify-content:center}.entry-serving-editor{flex-wrap:wrap}.serving-editor-field{width:100%}.result-detail-inline{position:static;margin-top:8px}}
  `,
  `
    @media (max-width: 760px) {
      :host {
        scrollbar-width: none;
      }
      :host::-webkit-scrollbar {
        width: 0;
        height: 0;
      }
      .page {
        gap: 12px;
        padding-bottom: 12px;
      }
      .card {
        padding: 16px;
      }
      .nutrition-pie-wrap {
        min-height: 220px;
        margin-top: 14px;
        padding-top: 8px;
      }
      .nutrition-pie-wrapper {
        width: min(260px, 72%);
        min-width: 180px;
      }
      .micro-pill {
        padding: 10px 12px;
        min-height: 40px;
        font-size: 12px;
      }
      .micro-pill strong {
        font-size: 11px;
      }
    }

    @media (max-width: 560px) {
      .current-date {
        font-size: 14px;
        min-width: 108px;
      }
      .add-food-trigger {
        height: 40px;
      }
      .entry-cal {
        font-size: 13px;
      }
      .entry-macros {
        gap: 8px;
      }
    }
  `],
})
export class NutritionLogComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();
  private searchRequestId = 0;

  log: NutritionLog | null = null;
  user: UserProfile | null = null;
  currentDate = new Date();
  mealTypes = MEAL_TYPES;
  selectedMealType = MEAL_TYPES[1] ?? MEAL_TYPES[0] ?? 'Lunch';
  addFoodOpen = false;
  addFoodClosing = false;
  activeTab: 'search' | 'custom' = 'search';
  advancedOptionsOpen = false;
  searchQuery = '';
  searchLoading = false;
  searchError = '';
  searchPage: FoodSearchPage | null = null;
  searchResults: FoodSearchResult[] = [];
  selectedFood: FoodSearchResult | null = null;
  expandedIdx: number | null = null;
  readonly searchPageSize = 5;
  pagePickerOpen = false;
  searchPageDraft = 1;
  editingEntryId: string | null = null;
  editingServingQty = '';
  customForm: FormGroup;
  readonly servingUnitOptions = FOOD_SERVING_UNITS;

  constructor(
    private readonly nutritionService: NutritionService,
    private readonly authService: AuthService,
    private readonly confettiService: ConfettiService,
    private readonly snackBar: MatSnackBar,
    private readonly fb: FormBuilder,
  ) {
    this.customForm = this.fb.group({
      foodName: ['', Validators.required], servingQty: [1, [Validators.required, Validators.min(0.1)]], servingUnit: ['serving', Validators.required],
      calories: [0, [Validators.required, Validators.min(0)]], proteinG: [0, [Validators.required, Validators.min(0)]], carbsG: [0, [Validators.required, Validators.min(0)]], fatG: [0, [Validators.required, Validators.min(0)]],
      fiberG: [0], sugarG: [0], addedSugarG: [0], saturatedFatG: [0], sodiumMg: [0], cholesterolMg: [0], potassiumMg: [0], caffeineMg: [0], electrolytesMg: [0],
      vitaminAMcg: [0], vitaminCMg: [0], vitaminDMcg: [0], vitaminEMg: [0], vitaminKMcg: [0], thiaminMg: [0], riboflavinMg: [0], niacinMg: [0], vitaminB6Mg: [0], vitaminB12Mcg: [0], folateMcg: [0], ironMg: [0],
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => this.user = user);
    this.searchSubject.pipe(debounceTime(420), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(query => this.performFoodSearch(query, 1));
    this.loadLog();
  }

  get dateStr(): string {
    const y = this.currentDate.getFullYear();
    const m = String(this.currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(this.currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  get canGoToPreviousPage(): boolean { return (this.searchPage?.currentPage || 1) > 1; }
  get canGoToNextPage(): boolean { return !!this.searchPage && this.searchPage.currentPage < this.searchPage.totalPages; }
  get searchSummary(): string {
    if (!this.searchPage || this.searchPage.totalHits <= 0) return '';
    const start = ((this.searchPage.currentPage - 1) * this.searchPageSize) + 1;
    const end = Math.min(start + this.searchResults.length - 1, this.searchPage.totalHits);
    return `Showing ${start}-${end} of ${this.searchPage.totalHits}`;
  }

  get noResultsMessage(): string {
    const query = this.searchQuery.trim();
    if (!query) return 'No matching foods showed up.';
    return `No strong matches showed up for "${query}". Try a more specific food name, or add it with Custom.`;
  }

  prevDay(): void {
    const previousDate = new Date(this.currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    this.currentDate = previousDate;
    this.loadLog();
  }
  nextDay(): void {
    const nextDate = new Date(this.currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    this.currentDate = nextDate;
    this.loadLog();
  }
  onDateChange(date: Date | null): void { if (!date) return; this.currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()); this.loadLog(); }

  openAddFood(meal: string = this.selectedMealType): void {
    this.selectedMealType = this.mealTypes.includes(meal) ? meal : (this.mealTypes[0] ?? 'Lunch');
    this.addFoodOpen = true;
    this.addFoodClosing = false;
    this.activeTab = 'search';
    this.advancedOptionsOpen = false;
    this.searchQuery = '';
    this.pagePickerOpen = false;
    this.searchPageDraft = 1;
    this.clearSearchState();
  }
  openAddFoodForMeal(meal: string): void { this.openAddFood(meal); }
  selectMeal(meal: string): void {
    if (this.mealTypes.includes(meal)) {
      this.selectedMealType = meal;
    }
  }
  closeAddFood(): void { this.pagePickerOpen = false; this.addFoodClosing = true; setTimeout(() => { this.addFoodOpen = false; this.addFoodClosing = false; }, 180); }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;
    if (query.trim().length < 2) { this.clearSearchState(); return; }
    this.searchSubject.next(query.trim());
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.triggerSearchNow();
  }

  triggerSearchNow(): void {
    const query = this.searchQuery.trim();
    if (query.length < 2) {
      this.clearSearchState();
      return;
    }
    this.performFoodSearch(query, 1);
  }

  goToSearchPage(page: number): void {
    if (!this.searchPage || page < 1 || page > this.searchPage.totalPages || this.searchLoading) return;
    this.pagePickerOpen = false;
    this.searchPageDraft = page;
    this.performFoodSearch(this.searchQuery, page);
  }

  toggleSearchPagePicker(): void {
    if (!this.searchPage) return;
    this.pagePickerOpen = !this.pagePickerOpen;
    this.searchPageDraft = this.searchPage.currentPage;
  }

  closeSearchPagePicker(): void {
    this.pagePickerOpen = false;
  }

  submitSearchPagePicker(): void {
    if (!this.searchPage) return;
    const page = Math.trunc(Number(this.searchPageDraft));
    if (!Number.isFinite(page) || page < 1 || page > this.searchPage.totalPages) {
      this.snackBar.open(`Enter a page between 1 and ${this.searchPage.totalPages}.`, 'Close', { duration: 2500 });
      return;
    }
    this.goToSearchPage(page);
  }

  selectFoodCard(food: FoodSearchResult, idx: number): void {
    if (this.expandedIdx === idx) {
      this.selectedFood = null;
      this.expandedIdx = null;
      return;
    }
    this.selectedFood = food;
    this.expandedIdx = idx;
  }

  openServingEditor(entry: { id: string; servingQty: number }): void {
    this.editingEntryId = entry.id;
    this.editingServingQty = String(entry.servingQty || 1);
  }
  cancelServingEditor(): void {
    this.editingEntryId = null;
    this.editingServingQty = '';
  }
  saveServingEditor(entry: { id: string; servingQty: number; servingUnit: string; foodName: string; brandName: string | null; mealType: string; calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; sugarG: number; addedSugarG: number; sodiumMg: number; cholesterolMg: number; saturatedFatG: number; potassiumMg: number; caffeineMg: number; electrolytesMg: number; vitaminAMcg: number; vitaminCMg: number; vitaminDMcg: number; vitaminEMg: number; vitaminKMcg: number; thiaminMg: number; riboflavinMg: number; niacinMg: number; vitaminB6Mg: number; vitaminB12Mcg: number; folateMcg: number; zincMg: number; calciumMg: number; ironMg: number; magnesiumMg: number; thumbnailUrl: string | null }): void {
    const newServingQty = this.normalizeNum(this.editingServingQty);
    const currentServingQty = Number(entry.servingQty || 0);
    if (!newServingQty || newServingQty <= 0) {
      this.snackBar.open('Serving quantity must be greater than 0.', 'Close', { duration: 2500 });
      return;
    }
    if (!currentServingQty || currentServingQty <= 0) {
      this.snackBar.open('Current serving quantity is invalid.', 'Close', { duration: 2500 });
      return;
    }
    const scale = newServingQty / currentServingQty;
    const updatedInput: FoodEntryInput = {
      foodName: entry.foodName,
      brandName: entry.brandName || undefined,
      mealType: entry.mealType,
      servingQty: newServingQty,
      servingUnit: entry.servingUnit,
      calories: this.round2(entry.calories * scale),
      proteinG: this.round2(entry.proteinG * scale),
      carbsG: this.round2(entry.carbsG * scale),
      fatG: this.round2(entry.fatG * scale),
      fiberG: this.round2(entry.fiberG * scale),
      sugarG: this.round2(entry.sugarG * scale),
      addedSugarG: this.round2(entry.addedSugarG * scale),
      sodiumMg: this.round2(entry.sodiumMg * scale),
      cholesterolMg: this.round2(entry.cholesterolMg * scale),
      saturatedFatG: this.round2(entry.saturatedFatG * scale),
      potassiumMg: this.round2(entry.potassiumMg * scale),
      caffeineMg: this.round2(entry.caffeineMg * scale),
      electrolytesMg: this.round2(entry.electrolytesMg * scale),
      vitaminAMcg: this.round2(entry.vitaminAMcg * scale),
      vitaminCMg: this.round2(entry.vitaminCMg * scale),
      vitaminDMcg: this.round2(entry.vitaminDMcg * scale),
      vitaminEMg: this.round2(entry.vitaminEMg * scale),
      vitaminKMcg: this.round2(entry.vitaminKMcg * scale),
      thiaminMg: this.round2(entry.thiaminMg * scale),
      riboflavinMg: this.round2(entry.riboflavinMg * scale),
      niacinMg: this.round2(entry.niacinMg * scale),
      vitaminB6Mg: this.round2(entry.vitaminB6Mg * scale),
      vitaminB12Mcg: this.round2(entry.vitaminB12Mcg * scale),
      folateMcg: this.round2(entry.folateMcg * scale),
      zincMg: this.round2(entry.zincMg * scale),
      calciumMg: this.round2(entry.calciumMg * scale),
      ironMg: this.round2(entry.ironMg * scale),
      magnesiumMg: this.round2(entry.magnesiumMg * scale),
      thumbnailUrl: entry.thumbnailUrl || undefined,
    };

    this.nutritionService.addFoodEntry(this.dateStr, updatedInput).pipe(
      switchMap(() => this.nutritionService.removeFoodEntry(this.dateStr, entry.id).pipe(
        map(log => ({ log, removeFailed: false })),
        catchError(() => this.nutritionService.getNutritionLog(this.dateStr).pipe(map(log => ({ log, removeFailed: true }))))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: result => {
        this.log = result.log;
        this.cancelServingEditor();
        this.snackBar.open(result.removeFailed ? 'Serving updated, but previous entry could not be removed. Remove it manually.' : 'Serving updated.', 'Close', { duration: 3200 });
      },
      error: () => this.snackBar.open('Failed to update serving.', 'Close', { duration: 3000 }),
    });
  }
  retryFoodSearch(): void {
    const query = this.searchQuery.trim();
    if (query.length < 2) {
      return;
    }
    const page = this.searchPage?.currentPage || 1;
    this.performFoodSearch(query, page);
  }

  addFood(food: FoodSearchResult): void {
    const displayName = this.displayFoodName(food);
    const displayBrand = this.searchBrandAlias ?? this.entryBrandName(food);
    const input: FoodEntryInput = {
      foodName: displayName, brandName: displayBrand || undefined, mealType: this.selectedMealType,
      servingQty: food.servingQty, servingUnit: food.servingUnit, calories: food.calories, proteinG: food.proteinG, carbsG: food.carbsG, fatG: food.fatG,
      fiberG: food.fiberG, sugarG: food.sugarG, addedSugarG: food.addedSugarG, sodiumMg: food.sodiumMg, cholesterolMg: food.cholesterolMg, saturatedFatG: food.saturatedFatG, potassiumMg: food.potassiumMg, caffeineMg: food.caffeineMg, electrolytesMg: this.estimateElectrolytesMg(food),
      vitaminAMcg: food.vitaminAMcg, vitaminCMg: food.vitaminCMg, vitaminDMcg: food.vitaminDMcg, vitaminEMg: food.vitaminEMg, vitaminKMcg: food.vitaminKMcg, thiaminMg: food.thiaminMg, riboflavinMg: food.riboflavinMg, niacinMg: food.niacinMg, vitaminB6Mg: food.vitaminB6Mg, vitaminB12Mcg: food.vitaminB12Mcg, folateMcg: food.folateMcg, zincMg: food.zincMg, calciumMg: food.calciumMg, ironMg: food.ironMg, magnesiumMg: food.magnesiumMg,
      thumbnailUrl: food.thumbnailUrl || undefined,
    };
    this.nutritionService.addFoodEntry(this.dateStr, input).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: log => {
        const goal = this.user?.dailyCalorieTarget || 2000;
        const wasBelowGoal = (this.log?.totalCalories || 0) < goal;
        this.log = log;
        this.closeAddFood();
        this.snackBar.open(`${displayName} added`, 'Close', { duration: 2200 });
        if (wasBelowGoal && log.totalCalories >= goal) this.confettiService.burst();
      },
      error: () => this.snackBar.open('Failed to add food', 'Close', { duration: 3000 }),
    });
  }
  addCustomFood(): void {
    if (this.customForm.invalid) { this.customForm.markAllAsTouched(); return; }
    this.sanitizeCustomFormNumericValues();
    const v = this.customForm.getRawValue();
    const input: FoodEntryInput = {
      foodName: v.foodName, mealType: this.selectedMealType, servingQty: v.servingQty, servingUnit: v.servingUnit, calories: v.calories,
      proteinG: v.proteinG, carbsG: v.carbsG, fatG: v.fatG, fiberG: v.fiberG, sugarG: v.sugarG, addedSugarG: v.addedSugarG, saturatedFatG: v.saturatedFatG,
      sodiumMg: v.sodiumMg, cholesterolMg: v.cholesterolMg, potassiumMg: v.potassiumMg, caffeineMg: v.caffeineMg, electrolytesMg: v.electrolytesMg, vitaminAMcg: v.vitaminAMcg, vitaminCMg: v.vitaminCMg,
      vitaminDMcg: v.vitaminDMcg, vitaminEMg: v.vitaminEMg, vitaminKMcg: v.vitaminKMcg, thiaminMg: v.thiaminMg, riboflavinMg: v.riboflavinMg, niacinMg: v.niacinMg, vitaminB6Mg: v.vitaminB6Mg, vitaminB12Mcg: v.vitaminB12Mcg, folateMcg: v.folateMcg, ironMg: v.ironMg,
    };
    this.nutritionService.addFoodEntry(this.dateStr, input).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: log => { this.log = log; this.resetCustomForm(); this.closeAddFood(); this.snackBar.open(`${v.foodName} added`, 'Close', { duration: 2200 }); },
      error: () => this.snackBar.open('Failed to add food', 'Close', { duration: 3000 }),
    });
  }

  removeEntry(entryId: string): void {
    this.nutritionService.removeFoodEntry(this.dateStr, entryId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: log => this.log = log,
      error: () => this.snackBar.open('Failed to remove entry', 'Close', { duration: 3000 }),
    });
  }

  getEntriesByMeal(mealType: string) { return this.log?.entries.filter(entry => entry.mealType === mealType) || []; }
  formatCalories(value: number | null | undefined): string { return String(Math.round(Number(value || 0))); }
  formatAmount(value: number | null | undefined, unit: string, digits = 0): string { return `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(Number(value || 0))}${unit}`; }
  formatServing(quantity: number | null | undefined, unit: string | null | undefined): string {
    const amount = Number(quantity || 0);
    const label = unit?.trim() || 'serving';
    return `${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} ${label}`;
  }
  estimateElectrolytesMg(food: { sodiumMg: number; potassiumMg: number; magnesiumMg: number; electrolytesMg: number }): number {
    const sodium = Number(food?.sodiumMg || 0);
    const potassium = Number(food?.potassiumMg || 0);
    const magnesium = Number(food?.magnesiumMg || 0);
    const estimated = Math.max(0, sodium) + Math.max(0, potassium) + Math.max(0, magnesium);
    return this.round2(estimated);
  }
  get pagePickerOptions(): number[] {
    if (!this.searchPage) return [];
    const pages = [1, this.searchPage.currentPage - 2, this.searchPage.currentPage - 1, this.searchPage.currentPage, this.searchPage.currentPage + 1, this.searchPage.currentPage + 2, this.searchPage.totalPages]
      .filter(page => page >= 1 && page <= this.searchPage!.totalPages);
    return Array.from(new Set(pages)).sort((left, right) => left - right);
  }

  get nutritionProteinPct(): number {
    const protein = this.log?.totalProteinG || 0;
    const carbs = this.log?.totalCarbsG || 0;
    const fat = this.log?.totalFatG || 0;
    const total = protein + carbs + fat;
    if (total <= 0) return 0;
    return (protein / total) * 100;
  }

  get nutritionCarbsPct(): number {
    const protein = this.log?.totalProteinG || 0;
    const carbs = this.log?.totalCarbsG || 0;
    const fat = this.log?.totalFatG || 0;
    const total = protein + carbs + fat;
    if (total <= 0) return this.nutritionProteinPct;
    return this.nutritionProteinPct + ((carbs / total) * 100);
  }

  get nutritionFatPct(): number {
    const protein = this.log?.totalProteinG || 0;
    const carbs = this.log?.totalCarbsG || 0;
    const fat = this.log?.totalFatG || 0;
    const total = protein + carbs + fat;
    if (total <= 0) return this.nutritionCarbsPct;
    return this.nutritionCarbsPct + ((fat / total) * 100);
  }

  get searchBrandAlias(): string | null {
    return this.resolveSearchBrandAlias(this.searchQuery);
  }

  displayFoodName(food: FoodSearchResult): string {
    const cleanedName = this.cleanFoodLabel(food.foodName);
    const explicitBrand = this.entryBrandName(food);
    const alias = this.searchBrandAlias;
    if (!alias || explicitBrand) {
      return cleanedName;
    }
    return this.rebrandGenericRestaurantName(cleanedName, alias);
  }

  displayFoodContext(food?: FoodSearchResult): string | null {
    const explicitBrand = food ? this.entryBrandName(food) : null;
    if (explicitBrand) {
      return explicitBrand;
    }

    const alias = this.searchBrandAlias;
    if (!alias) {
      return null;
    }
    return `${alias} menu-style match`;
  }

  resultMonogram(food: FoodSearchResult): string {
    return this.displayFoodName(food).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'FD';
  }

  trackFoodResult(index: number, food: FoodSearchResult): string { return `${food.foodName}-${food.brandName || 'unbranded'}-${index}`; }
  private performFoodSearch(query: string, page: number): void {
    const normalized = query.trim();
    if (normalized.length < 2) { this.clearSearchState(); return; }
    const requestId = ++this.searchRequestId;
    this.searchLoading = true;
    this.searchError = '';
    this.expandedIdx = null;
    this.selectedFood = null;
    this.nutritionService.searchFood(normalized, page, this.searchPageSize).pipe(retry({ count: 1, delay: 250 }), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        if (requestId !== this.searchRequestId) return;
        this.searchPage = result;
        this.searchResults = result.foods;
        this.selectedFood = null;
        this.expandedIdx = null;
        this.searchLoading = false;
        this.pagePickerOpen = false;
        this.searchPageDraft = result.currentPage;
      },
      error: () => {
        if (requestId !== this.searchRequestId) return;
        this.searchPage = emptyFoodSearchPage(page);
        this.searchResults = [];
        this.searchLoading = false;
        this.pagePickerOpen = false;
        this.searchPageDraft = 1;
        this.searchError = 'Could not load food search results right now.';
      },
    });
  }

  private clearSearchState(): void { this.searchRequestId += 1; this.searchLoading = false; this.searchError = ''; this.searchPage = null; this.searchResults = []; this.selectedFood = null; this.expandedIdx = null; this.pagePickerOpen = false; this.searchPageDraft = 1; }
  private resetCustomForm(): void { this.customForm.reset({ foodName: '', servingQty: 1, servingUnit: 'serving', calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, addedSugarG: 0, saturatedFatG: 0, sodiumMg: 0, cholesterolMg: 0, potassiumMg: 0, caffeineMg: 0, electrolytesMg: 0, vitaminAMcg: 0, vitaminCMg: 0, vitaminDMcg: 0, vitaminEMg: 0, vitaminKMcg: 0, thiaminMg: 0, riboflavinMg: 0, niacinMg: 0, vitaminB6Mg: 0, vitaminB12Mcg: 0, folateMcg: 0, ironMg: 0 }); }
  private entryBrandName(food: FoodSearchResult): string | null {
    const brand = food.brandName?.trim();
    if (!brand || this.isGenericRestaurantResult(brand)) {
      return null;
    }
    return this.cleanFoodLabel(brand);
  }

  private resolveSearchBrandAlias(query: string): string | null {
    const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!normalized) return null;
    if (normalized.includes('raising canes') || normalized.includes('raising cane') || normalized === 'canes' || normalized.endsWith(' canes')) return "Raising Cane's";
    if (normalized.includes('chick fil a') || normalized.includes('chickfila') || normalized.includes('cfa')) return 'Chick-fil-A';
    if (normalized.includes('chipotle')) return 'Chipotle';
    if (normalized.includes('popeyes')) return 'Popeyes';
    if (normalized.includes('mcdonald')) return "McDonald's";
    if (normalized.includes('taco bell')) return 'Taco Bell';
    if (normalized.includes('burger king')) return 'Burger King';
    if (normalized.includes('wendys') || normalized.includes('wendy s')) return "Wendy's";
    if (normalized.includes('starbucks')) return 'Starbucks';
    return null;
  }

  private isGenericRestaurantResult(value: string | null | undefined): boolean {
    if (!value) return false;
    const normalized = value.toLowerCase();
    return normalized.includes('fast food')
      || normalized.includes('restaurant')
      || normalized.includes('fooddata central')
      || normalized.includes('usda')
      || normalized.includes('food service')
      || normalized.includes('generic');
  }

  private rebrandGenericRestaurantName(value: string, alias: string): string {
    const normalized = value.toLowerCase();
    if (/chicken tenders|chicken strips/.test(normalized)) return `${alias} Chicken Tenders`;
    if (/chick-?n-?strips/.test(normalized)) return `${alias} Chick-n-Strips`;
    if (/nuggets?/.test(normalized)) return `${alias} Nuggets`;
    if (/sandwich/.test(normalized) && /grilled/.test(normalized)) return `${alias} Grilled Chicken Sandwich`;
    if (/sandwich/.test(normalized) && /cheese/.test(normalized)) return alias === 'Chick-fil-A' ? `${alias} Deluxe Chicken Sandwich` : `${alias} Chicken Sandwich with Cheese`;
    if (/sandwich/.test(normalized)) return `${alias} Chicken Sandwich`;
    if (/wrap/.test(normalized)) return `${alias} Wrap`;
    if (/salad/.test(normalized)) return `${alias} Salad`;
    if (/coleslaw/.test(normalized)) return `${alias} Coleslaw`;
    if (/toast/.test(normalized)) return `${alias} Toast`;
    if (/crinkle|fries/.test(normalized)) return `${alias} Fries`;
    if (/lemonade/.test(normalized)) return `${alias} Lemonade`;
    return `${alias} ${this.cleanFoodLabel(value)}`;
  }

  private cleanFoodLabel(value: string): string {
    const cleaned = value
      .replace(/^fast foods?,?\s*/i, '')
      .replace(/^restaurant,?\s*/i, '')
      .replace(/,?\s*from fast food\/restaurant/gi, '')
      .replace(/,?\s*from fast food/gi, '')
      .replace(/,?\s*fast food\/restaurant/gi, '')
      .replace(/,?\s*restaurant/gi, '')
      .replace(/,?\s*plain with pickles/gi, '')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .replace(/^,\s*/, '')
      .replace(/,\s*$/, '');

    return this.titleCaseLabel(cleaned);
  }

  private titleCaseLabel(value: string): string {
    return value
      .split(' ')
      .filter(Boolean)
      .map(part => part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  private sanitizeCustomFormNumericValues(): void { ['servingQty','calories','proteinG','carbsG','fatG','fiberG','sugarG','addedSugarG','saturatedFatG','sodiumMg','cholesterolMg','potassiumMg','caffeineMg','electrolytesMg','vitaminAMcg','vitaminCMg','vitaminDMcg','vitaminEMg','vitaminKMcg','thiaminMg','riboflavinMg','niacinMg','vitaminB6Mg','vitaminB12Mcg','folateMcg','ironMg'].forEach(field => { const control = this.customForm.get(field); if (control) control.setValue(this.normalizeNum(control.value)); }); }
  private normalizeNum(value: unknown): number { const raw = String(value ?? '').replace(/[^0-9.]/g, ''); return raw ? (Number.parseFloat(raw) || 0) : 0; }
  private round2(value: number): number { return Math.round((value || 0) * 100) / 100; }
  private loadLog(): void {
    const requestDate = this.dateStr;
    this.nutritionService.getNutritionLog(requestDate).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(log => {
      // Ignore late responses from older date requests when users quickly switch days.
      if (this.dateStr !== requestDate) return;
      this.log = log;
    });
  }
}

function emptyFoodSearchPage(page: number): FoodSearchPage {
  return { currentPage: Math.max(page, 1), totalPages: 1, totalHits: 0, foods: [] };
}



















