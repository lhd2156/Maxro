import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NumericInputDirective } from '../../../shared/directives/numeric-input.directive';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { MacroBarComponent } from '../../../shared/components/macro-bar/macro-bar.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { NutritionService } from '../../../core/services/nutrition.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfettiService } from '../../../core/services/confetti.service';
import { FoodSearchResult, NutritionLog, MEAL_TYPES, FoodEntryInput } from '../../../core/models/nutrition.model';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-nutrition-log',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatTabsModule,
    MatDatepickerModule, MatNativeDateModule, MatTooltipModule,
    MacroBarComponent, LoadingSpinnerComponent,
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
            <button mat-icon-button (click)="nutritionDatePicker.open()" matTooltip="Pick date" class="calendar-btn">
              <mat-icon svgIcon="mx-calendar"></mat-icon>
            </button>
            <input [matDatepicker]="nutritionDatePicker" [ngModel]="currentDate" (ngModelChange)="onDateChange($event)" class="date-picker-input" readonly>
            <mat-datepicker #nutritionDatePicker></mat-datepicker>
          </div>
          <button mat-flat-button class="add-food-trigger" (click)="openAddFood()">
            <mat-icon svgIcon="mx-plus"></mat-icon> Add Food
          </button>
        </div>
      </div>

      <div class="top-row">
        <mat-card class="macros-card compact">
          <div class="macro-bars">
            <app-macro-bar label="Calories" [current]="log?.totalCalories || 0" [goal]="user?.dailyCalorieTarget || 2000" unit=" kcal" />
            <app-macro-bar label="Protein" [current]="log?.totalProteinG || 0" [goal]="user?.dailyProteinTarget || 150" />
            <app-macro-bar label="Carbs" [current]="log?.totalCarbsG || 0" [goal]="user?.dailyCarbTarget || 250" />
            <app-macro-bar label="Fat" [current]="log?.totalFatG || 0" [goal]="user?.dailyFatTarget || 65" />
          </div>
        </mat-card>
        <mat-card class="micros-card compact">
          <div class="micro-grid-inline">
            <div class="micro-pill"><span class="micro-l">Fiber</span><span class="micro-v">{{ log?.totalFiberG || 0 | number:'1.0-1' }}g</span></div>
            <div class="micro-pill"><span class="micro-l">Sugar</span><span class="micro-v">{{ log?.totalSugarG || 0 | number:'1.0-1' }}g</span></div>
            <div class="micro-pill"><span class="micro-l">Sat. Fat</span><span class="micro-v">{{ log?.totalSaturatedFatG || 0 | number:'1.0-1' }}g</span></div>
            <div class="micro-pill"><span class="micro-l">Sodium</span><span class="micro-v">{{ log?.totalSodiumMg || 0 | number:'1.0-0' }}mg</span></div>
            <div class="micro-pill"><span class="micro-l">Cholesterol</span><span class="micro-v">{{ log?.totalCholesterolMg || 0 | number:'1.0-0' }}mg</span></div>
            <div class="micro-pill"><span class="micro-l">Potassium</span><span class="micro-v">{{ log?.totalPotassiumMg || 0 | number:'1.0-0' }}mg</span></div>
          </div>
          <p class="micro-section-label">Vitamins &amp; micronutrients</p>
          <div class="micro-grid-inline vitamins-row">
            <div class="micro-pill"><span class="micro-l">Vitamin A</span><span class="micro-v">{{ micronutrients?.['vitaminA'] ?? '—' }}</span></div>
            <div class="micro-pill"><span class="micro-l">Vitamin C</span><span class="micro-v">{{ micronutrients?.['vitaminC'] ?? '—' }}</span></div>
            <div class="micro-pill"><span class="micro-l">Vitamin D</span><span class="micro-v">{{ micronutrients?.['vitaminD'] ?? '—' }}</span></div>
            <div class="micro-pill"><span class="micro-l">Calcium</span><span class="micro-v">{{ micronutrients?.['calcium'] ?? '—' }}</span></div>
            <div class="micro-pill"><span class="micro-l">Iron</span><span class="micro-v">{{ micronutrients?.['iron'] ?? '—' }}</span></div>
            <div class="micro-pill"><span class="micro-l">Magnesium</span><span class="micro-v">{{ micronutrients?.['magnesium'] ?? '—' }}</span></div>
          </div>
        </mat-card>
      </div>

      <mat-card class="entries-card compact">
        @for (mealType of mealTypes; track mealType) {
          <div class="meal-group">
            <span class="meal-label">{{ mealType }}</span>
            @if (getEntriesByMeal(mealType).length > 0) {
              @for (entry of getEntriesByMeal(mealType); track entry.id) {
                <div class="entry-row">
                  <div class="entry-info">
                    <span class="entry-name">{{ entry.foodName }}</span>
                    <span class="entry-serving">{{ entry.servingQty }} {{ entry.servingUnit }}</span>
                  </div>
                  <div class="entry-macros">
                    <span class="entry-macro p">{{ entry.proteinG | number:'1.0-0' }}P</span>
                    <span class="entry-macro c">{{ entry.carbsG | number:'1.0-0' }}C</span>
                    <span class="entry-macro f">{{ entry.fatG | number:'1.0-0' }}F</span>
                  </div>
                  <span class="entry-cal">{{ entry.calories | number:'1.0-0' }} cal</span>
                  <button mat-icon-button (click)="removeEntry(entry.id)" class="remove-btn" aria-label="Remove">
                    <span class="remove-x">×</span>
                  </button>
                </div>
              }
            } @else {
              <div class="meal-empty">
                <span class="meal-empty-text">No {{ mealType | lowercase }} logged</span>
                <button mat-stroked-button class="meal-add-btn" (click)="openAddFoodForMeal(mealType)">Add</button>
              </div>
            }
          </div>
        }
      </mat-card>
    </div>

    <!-- Add Food Modal Overlay -->
    @if (addFoodOpen) {
      <div class="modal-backdrop" [class.closing]="addFoodClosing" (click)="closeAddFood()">
        <div class="modal-panel" [class.closing]="addFoodClosing" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add Food</h2>
            <button mat-icon-button (click)="closeAddFood()" class="modal-close">
              <mat-icon svgIcon="mx-x"></mat-icon>
            </button>
          </div>

          <div class="modal-tabs">
            <button class="tab-btn" [class.active]="activeTab === 'search'" (click)="activeTab = 'search'">Search</button>
            <button class="tab-btn" [class.active]="activeTab === 'custom'" (click)="activeTab = 'custom'">Custom</button>
          </div>

          <div class="modal-body">
            <div class="meal-picker">
              <mat-form-field appearance="outline" class="meal-select-modal">
                <mat-label>Meal</mat-label>
                <mat-select [(value)]="selectedMealType">
                  @for (meal of mealTypes; track meal) {
                    <mat-option [value]="meal">{{ meal }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            @if (activeTab === 'search') {
              <mat-form-field appearance="outline" class="search-field-modal">
                <mat-label>Search food (e.g. "chicken breast")</mat-label>
                <input matInput (input)="onSearchInput($event)" [value]="searchQuery" #searchInput>
                <mat-icon matSuffix svgIcon="mx-search"></mat-icon>
              </mat-form-field>

              @if (searchLoading) {
                <app-loading-spinner />
              }

              @if (searchResults.length > 0) {
                <div class="search-results-modal">
                  @for (food of searchResults; track food.foodName; let idx = $index) {
                    <div class="food-result" [class.expanded]="expandedIdx === idx">
                      <div class="food-result-main" (click)="toggleExpand(idx)">
                        @if (food.thumbnailUrl) {
                          <img [src]="food.thumbnailUrl" [alt]="food.foodName" class="food-thumb">
                        } @else {
                          <div class="food-thumb-placeholder"><mat-icon svgIcon="mx-utensils"></mat-icon></div>
                        }
                        <div class="food-info">
                          <span class="food-name">{{ food.foodName }}</span>
                          @if (food.brandName) {
                            <span class="food-brand">{{ food.brandName }}</span>
                          }
                          <span class="food-serving">{{ food.servingQty }} {{ food.servingUnit }}</span>
                        </div>
                        <span class="cal-badge">{{ food.calories | number:'1.0-0' }} cal</span>
                        <button mat-flat-button class="add-food-btn" (click)="addFood(food); $event.stopPropagation()">Add</button>
                      </div>
                      @if (expandedIdx === idx) {
                        <div class="food-detail">
                          <div class="detail-grid">
                            <div class="detail-item"><span class="d-label">Protein</span><span class="d-val">{{ food.proteinG | number:'1.0-1' }}g</span></div>
                            <div class="detail-item"><span class="d-label">Carbs</span><span class="d-val">{{ food.carbsG | number:'1.0-1' }}g</span></div>
                            <div class="detail-item"><span class="d-label">Fat</span><span class="d-val">{{ food.fatG | number:'1.0-1' }}g</span></div>
                            <div class="detail-item"><span class="d-label">Fiber</span><span class="d-val">{{ food.fiberG | number:'1.0-1' }}g</span></div>
                            <div class="detail-item"><span class="d-label">Sugar</span><span class="d-val">{{ food.sugarG | number:'1.0-1' }}g</span></div>
                            <div class="detail-item"><span class="d-label">Sodium</span><span class="d-val">{{ food.sodiumMg | number:'1.0-0' }}mg</span></div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            }

            @if (activeTab === 'custom') {
              <form [formGroup]="customForm" (ngSubmit)="addCustomFood()" class="custom-form">
                <mat-form-field appearance="outline">
                  <mat-label>Food Name</mat-label>
                  <input matInput formControlName="foodName">
                </mat-form-field>
                <div class="custom-row">
                  <mat-form-field appearance="outline" class="small-field">
                    <mat-label>Serving Qty</mat-label>
                    <input matInput formControlName="servingQty" type="number" appNumericInput="decimal">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="small-field">
                    <mat-label>Unit</mat-label>
                    <input matInput formControlName="servingUnit" placeholder="e.g. oz, cup">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="small-field">
                    <mat-label>Calories</mat-label>
                    <input matInput formControlName="calories" type="number" appNumericInput="decimal">
                  </mat-form-field>
                </div>
                <div class="custom-row">
                  <mat-form-field appearance="outline" class="small-field">
                    <mat-label>Protein (g)</mat-label>
                    <input matInput formControlName="proteinG" type="number" appNumericInput="decimal">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="small-field">
                    <mat-label>Carbs (g)</mat-label>
                    <input matInput formControlName="carbsG" type="number" appNumericInput="decimal">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="small-field">
                    <mat-label>Fat (g)</mat-label>
                    <input matInput formControlName="fatG" type="number" appNumericInput="decimal">
                  </mat-form-field>
                </div>

                <div class="advanced-toggle-wrap">
                  <button type="button" class="advanced-toggle" (click)="advancedOptionsOpen = !advancedOptionsOpen"
                    [attr.aria-expanded]="advancedOptionsOpen">
                    <mat-icon svgIcon="mx-chevron-down" class="chevron" [class.open]="advancedOptionsOpen"></mat-icon>
                    <span>Advanced options</span>
                    <span class="advanced-hint">Fiber, sodium, vitamins &amp; more</span>
                  </button>
                  @if (advancedOptionsOpen) {
                    <div class="advanced-fields">
                      <p class="advanced-label">Fiber, sugar, sodium &amp; more</p>
                      <div class="custom-row">
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Fiber (g)</mat-label>
                          <input matInput formControlName="fiberG" type="number" min="0" appNumericInput="decimal">
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Sugar (g)</mat-label>
                          <input matInput formControlName="sugarG" type="number" min="0" appNumericInput="decimal">
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Sat. Fat (g)</mat-label>
                          <input matInput formControlName="saturatedFatG" type="number" min="0" appNumericInput="decimal">
                        </mat-form-field>
                      </div>
                      <div class="custom-row">
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Sodium (mg)</mat-label>
                          <input matInput formControlName="sodiumMg" type="number" min="0" appNumericInput>
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Cholesterol (mg)</mat-label>
                          <input matInput formControlName="cholesterolMg" type="number" min="0" appNumericInput>
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Potassium (mg)</mat-label>
                          <input matInput formControlName="potassiumMg" type="number" min="0" appNumericInput>
                        </mat-form-field>
                      </div>
                      <p class="advanced-label">Vitamins (optional)</p>
                      <div class="custom-row">
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Vitamin A</mat-label>
                          <input matInput formControlName="vitaminA" placeholder="e.g. 100% DV">
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Vitamin C</mat-label>
                          <input matInput formControlName="vitaminC" placeholder="e.g. 60mg">
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Vitamin D</mat-label>
                          <input matInput formControlName="vitaminD" placeholder="e.g. 400 IU">
                        </mat-form-field>
                      </div>
                      <div class="custom-row">
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Calcium</mat-label>
                          <input matInput formControlName="calcium" placeholder="e.g. 300mg">
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Iron</mat-label>
                          <input matInput formControlName="iron" placeholder="e.g. 8mg">
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="small-field">
                          <mat-label>Magnesium</mat-label>
                          <input matInput formControlName="magnesium" placeholder="e.g. 100mg">
                        </mat-form-field>
                      </div>
                    </div>
                  }
                </div>

                <button mat-flat-button class="submit-custom" type="submit" [disabled]="customForm.invalid">
                  Add Custom Food
                </button>
              </form>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px;
    }
    h1 { color: var(--text-primary); font-size: 24px; font-weight: 700; margin: 0; }
    .header-right { display: flex; align-items: center; gap: 12px; }
    .date-nav { display: flex; align-items: center; gap: 4px; }
    .date-nav button { color: var(--text-muted); }
    .current-date { font-size: 14px; font-weight: 600; color: var(--text-primary); min-width: 100px; text-align: center; }
    .calendar-btn { color: var(--text-muted); }
    .calendar-btn:hover { color: var(--accent); }
    .date-picker-input { position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none; }

    .add-food-trigger {
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; font-size: 13px; border-radius: 10px;
    }

    .top-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;
    }
    .compact {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 16px;
    }
    .macro-bars { display: flex; flex-direction: column; gap: 10px; }

    .micro-grid-inline {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
    }
    .micro-pill {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 8px; background: rgba(255,255,255,0.02); border-radius: 6px;
    }
    .micro-l { font-size: 11px; color: var(--text-muted); }
    .micro-v { font-size: 12px; font-weight: 600; color: var(--text-primary); }
    .micro-section-label {
      font-size: 11px; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.5px;
      margin: 12px 0 6px; display: block;
    }
    .vitamins-row { margin-top: 0; }

    .entries-card { margin-bottom: 12px; }
    .meal-group { margin-bottom: 12px; }
    .meal-group:last-child { margin-bottom: 0; }
    .meal-label {
      font-size: 11px; font-weight: 700; color: var(--accent);
      text-transform: uppercase; letter-spacing: 1px;
      display: block; margin-bottom: 6px;
    }
    .entry-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 8px;
      background: rgba(255,255,255,0.02); margin-bottom: 3px;
    }
    .entry-info { flex: 1; display: flex; flex-direction: column; }
    .entry-name { font-size: 13px; font-weight: 500; color: var(--text-primary); text-transform: capitalize; }
    .entry-serving { font-size: 11px; color: var(--text-muted); }
    .entry-macros { display: flex; gap: 6px; }
    .entry-macro { font-size: 11px; font-weight: 600; }
    .entry-macro.p { color: #4fc3f7; }
    .entry-macro.c { color: #C8F135; }
    .entry-macro.f { color: #ff7043; }
    .entry-cal { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; }
    .remove-btn {
      color: #fff; width: 32px; height: 32px;
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      margin-left: 8px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      transition: color 0.15s, background 0.15s, border-color 0.15s;
    }
    .remove-btn:hover {
      color: #fff;
      background: rgba(255,82,82,0.35);
      border-color: rgba(255,82,82,0.5);
    }
    .remove-btn .remove-x {
      font-size: 22px; font-weight: 700; line-height: 1;
      color: #fff; display: block;
    }

    .meal-empty {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px; border-radius: 8px;
      background: rgba(255,255,255,0.015);
    }
    .meal-empty-text {
      font-size: 13px; color: var(--text-muted); font-style: italic;
    }
    .meal-add-btn {
      border-color: rgba(255,255,255,0.12) !important;
      color: var(--text-muted) !important;
      font-size: 12px; font-weight: 600; border-radius: 6px;
      min-width: 0; padding: 2px 12px; height: 28px;
    }
    .meal-add-btn:hover {
      border-color: var(--accent) !important; color: var(--accent) !important;
    }

    /* Modal overlay */
    @keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes panel-in {
      from { opacity: 0; transform: translateY(40px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes backdrop-out { from { opacity: 1; } to { opacity: 0; } }
    @keyframes panel-out {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(40px) scale(0.97); }
    }

    .modal-backdrop {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      animation: backdrop-in 0.25s ease-out;
      padding: 24px;
    }
    .modal-backdrop.closing { animation: backdrop-out 0.2s ease-in forwards; }

    .modal-panel {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      width: 100%; max-width: 560px;
      max-height: 85vh; overflow-y: auto;
      animation: panel-in 0.3s ease-out;
    }
    .modal-panel.closing { animation: panel-out 0.2s ease-in forwards; }

    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px 0;
    }
    .modal-header h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .modal-close { color: var(--text-muted); }

    .modal-tabs {
      display: flex; gap: 4px; padding: 16px 24px 0;
    }
    .tab-btn {
      flex: 1; padding: 8px 0; border: none; border-radius: 8px;
      background: transparent; color: var(--text-muted);
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .tab-btn.active {
      background: rgba(200,241,53,0.1); color: var(--accent);
    }
    .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.04); }

    .modal-body { padding: 16px 24px 24px; }
    .meal-picker { margin-bottom: 12px; }
    .meal-select-modal { width: 100%; }
    .search-field-modal { width: 100%; }

    .search-results-modal { display: flex; flex-direction: column; gap: 4px; }
    .food-result {
      border-radius: 10px; overflow: hidden;
      border: 1px solid transparent; transition: border-color 0.15s;
    }
    .food-result:hover { border-color: rgba(255,255,255,0.08); }
    .food-result.expanded { border-color: rgba(200,241,53,0.2); background: rgba(255,255,255,0.02); }
    .food-result-main {
      display: flex; align-items: center; gap: 10px;
      padding: 10px; cursor: pointer; transition: background 0.15s;
    }
    .food-result-main:hover { background: rgba(255,255,255,0.03); }
    .food-thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
    .food-thumb-placeholder {
      width: 40px; height: 40px; border-radius: 8px;
      background: rgba(255,255,255,0.04); display: flex;
      align-items: center; justify-content: center;
    }
    .food-thumb-placeholder mat-icon { color: var(--text-muted); font-size: 16px; width: 16px; height: 16px; }
    .food-info { flex: 1; display: flex; flex-direction: column; }
    .food-name { font-size: 13px; font-weight: 600; color: var(--text-primary); text-transform: capitalize; }
    .food-brand { font-size: 11px; color: var(--text-muted); }
    .food-serving { font-size: 11px; color: var(--text-muted); }
    .cal-badge {
      font-size: 12px; font-weight: 700; color: var(--accent);
      background: rgba(200,241,53,0.08); padding: 3px 8px; border-radius: 6px;
      white-space: nowrap;
    }
    .add-food-btn {
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; font-size: 12px; border-radius: 8px;
      min-width: 48px; height: 32px;
    }
    .food-detail { padding: 0 10px 10px; }
    .detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .detail-item {
      display: flex; justify-content: space-between;
      padding: 5px 7px; background: rgba(255,255,255,0.03); border-radius: 5px;
    }
    .d-label { font-size: 10px; color: var(--text-muted); }
    .d-val { font-size: 11px; font-weight: 600; color: var(--text-primary); }

    /* Custom food form */
    .custom-form { display: flex; flex-direction: column; gap: 4px; }
    .custom-row { display: flex; gap: 8px; }
    .small-field { flex: 1; }
    .submit-custom {
      width: 100%; height: 44px; margin-top: 4px;
      background: var(--accent) !important; color: #0D0D0D !important;
      font-weight: 700; font-size: 14px; border-radius: 10px;
    }
    .submit-custom:disabled { opacity: 0.4; }

    .advanced-toggle-wrap { margin-top: 8px; }
    .advanced-toggle {
      display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 10px 12px; border-radius: 8px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      color: var(--text-muted); font-size: 13px; font-weight: 600;
      cursor: pointer; text-align: left; transition: background 0.15s, border-color 0.15s;
    }
    .advanced-toggle:hover {
      background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);
      color: var(--text-primary);
    }
    .advanced-toggle .chevron {
      width: 18px; height: 18px; font-size: 18px;
      transition: transform 0.2s ease;
    }
    .advanced-toggle .chevron.open { transform: rotate(180deg); }
    .advanced-toggle .advanced-hint {
      margin-left: auto; font-size: 11px; font-weight: 400; opacity: 0.8;
    }
    .advanced-fields { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
    .advanced-label {
      font-size: 11px; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.5px;
      margin: 8px 0 4px; display: block;
    }
    .advanced-label:first-child { margin-top: 0; }

    @media (max-width: 900px) {
      .top-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      .micro-grid-inline { grid-template-columns: repeat(3, 1fr); }
      .detail-grid { grid-template-columns: repeat(2, 1fr); }
      .custom-row { flex-direction: column; gap: 4px; }
      .page-header { flex-direction: column; gap: 10px; align-items: flex-start; }
      .header-right { width: 100%; justify-content: space-between; }
      .entry-row { flex-wrap: wrap; }
    }
    @media (max-width: 480px) {
      .micro-grid-inline { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class NutritionLogComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();
  log: NutritionLog | null = null;
  user: UserProfile | null = null;
  currentDate = new Date();
  searchResults: FoodSearchResult[] = [];
  searchQuery = '';
  searchLoading = false;
  selectedMealType = 'Lunch';
  mealTypes = MEAL_TYPES;
  expandedIdx: number | null = null;

  addFoodOpen = false;
  addFoodClosing = false;
  activeTab: 'search' | 'custom' = 'search';
  advancedOptionsOpen = false;
  customForm: FormGroup;
  /** Placeholder for future API; keys like vitaminA, vitaminC, etc. */
  micronutrients: { [key: string]: string } | null = null;

  constructor(
    private readonly nutritionService: NutritionService,
    private readonly authService: AuthService,
    private readonly confettiService: ConfettiService,
    private readonly snackBar: MatSnackBar,
    private readonly fb: FormBuilder,
  ) {
    this.customForm = this.fb.group({
      foodName: ['', Validators.required],
      servingQty: [1, [Validators.required, Validators.min(0.1)]],
      servingUnit: ['serving', Validators.required],
      calories: [0, [Validators.required, Validators.min(0)]],
      proteinG: [0, [Validators.required, Validators.min(0)]],
      carbsG: [0, [Validators.required, Validators.min(0)]],
      fatG: [0, [Validators.required, Validators.min(0)]],
      vitaminA: [''],
      vitaminC: [''],
      vitaminD: [''],
      calcium: [''],
      iron: [''],
      magnesium: [''],
      fiberG: [0],
      sugarG: [0],
      saturatedFatG: [0],
      sodiumMg: [0],
      cholesterolMg: [0],
      potassiumMg: [0],
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => this.user = user);

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) { this.searchResults = []; this.searchLoading = false; return []; }
        this.searchLoading = true;
        return this.nutritionService.searchFood(query);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: results => {
        this.searchResults = results.slice(0, 5);
        this.searchLoading = false;
        this.expandedIdx = null;
      },
      error: () => { this.searchLoading = false; },
    });

    this.loadLog();
  }

  get dateStr(): string { return this.currentDate.toISOString().split('T')[0]; }

  prevDay(): void {
    this.currentDate = new Date(this.currentDate.getTime() - 86400000);
    this.loadLog();
  }

  nextDay(): void {
    this.currentDate = new Date(this.currentDate.getTime() + 86400000);
    this.loadLog();
  }

  onDateChange(date: Date | null): void {
    if (!date) return;
    this.currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    this.loadLog();
  }

  openAddFood(): void {
    this.addFoodOpen = true;
    this.addFoodClosing = false;
    this.searchResults = [];
    this.searchQuery = '';
    this.expandedIdx = null;
    this.activeTab = 'search';
  }

  openAddFoodForMeal(meal: string): void {
    this.selectedMealType = meal;
    this.openAddFood();
  }

  closeAddFood(): void {
    this.addFoodClosing = true;
    setTimeout(() => {
      this.addFoodOpen = false;
      this.addFoodClosing = false;
    }, 200);
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  toggleExpand(idx: number): void {
    this.expandedIdx = this.expandedIdx === idx ? null : idx;
  }

  addFood(food: FoodSearchResult): void {
    const input: FoodEntryInput = {
      foodName: food.foodName,
      brandName: food.brandName || undefined,
      mealType: this.selectedMealType,
      servingQty: food.servingQty,
      servingUnit: food.servingUnit,
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      fiberG: food.fiberG,
      sugarG: food.sugarG,
      sodiumMg: food.sodiumMg,
      cholesterolMg: food.cholesterolMg,
      saturatedFatG: food.saturatedFatG,
      potassiumMg: food.potassiumMg,
      thumbnailUrl: food.thumbnailUrl || undefined,
    };

    this.nutritionService.addFoodEntry(this.dateStr, input)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: log => {
          const wasCalorieGoalMet = (this.log?.totalCalories || 0) < (this.user?.dailyCalorieTarget || 2000);
          this.log = log;
          this.closeAddFood();
          this.snackBar.open(`${food.foodName} added`, 'Close', { duration: 2000 });
          if (wasCalorieGoalMet && log.totalCalories >= (this.user?.dailyCalorieTarget || 2000)) {
            this.confettiService.burst();
          }
        },
        error: () => this.snackBar.open('Failed to add food', 'Close', { duration: 3000 }),
      });
  }

  addCustomFood(): void {
    if (this.customForm.invalid) return;
    this.sanitizeCustomFormNumericValues();
    const v = this.customForm.value;
    const input: FoodEntryInput = {
      foodName: v.foodName,
      mealType: this.selectedMealType,
      servingQty: v.servingQty,
      servingUnit: v.servingUnit,
      calories: v.calories,
      proteinG: v.proteinG,
      carbsG: v.carbsG,
      fatG: v.fatG,
      fiberG: v.fiberG ?? 0,
      sugarG: v.sugarG ?? 0,
      saturatedFatG: v.saturatedFatG ?? 0,
      sodiumMg: v.sodiumMg ?? 0,
      cholesterolMg: v.cholesterolMg ?? 0,
      potassiumMg: v.potassiumMg ?? 0,
    };

    this.nutritionService.addFoodEntry(this.dateStr, input)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: log => {
          this.log = log;
          this.closeAddFood();
          this.customForm.reset({
            servingQty: 1, servingUnit: 'serving', calories: 0, proteinG: 0, carbsG: 0, fatG: 0,
            vitaminA: '', vitaminC: '', vitaminD: '', calcium: '', iron: '', magnesium: '',
            fiberG: 0, sugarG: 0, saturatedFatG: 0, sodiumMg: 0, cholesterolMg: 0, potassiumMg: 0,
          });
          this.snackBar.open(`${v.foodName} added`, 'Close', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to add food', 'Close', { duration: 3000 }),
      });
  }

  removeEntry(entryId: string): void {
    this.nutritionService.removeFoodEntry(this.dateStr, entryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: log => this.log = log,
        error: () => this.snackBar.open('Failed to remove entry', 'Close', { duration: 3000 }),
      });
  }

  getEntriesByMeal(mealType: string) {
    return this.log?.entries.filter(e => e.mealType === mealType) || [];
  }

  private sanitizeCustomFormNumericValues(): void {
    const numFields = ['servingQty', 'calories', 'proteinG', 'carbsG', 'fatG', 'fiberG', 'sugarG', 'saturatedFatG', 'sodiumMg', 'cholesterolMg', 'potassiumMg'];
    numFields.forEach(f => {
      const c = this.customForm.get(f);
      if (c?.value != null) c.setValue(this.normalizeNum(c.value, f === 'servingQty' || f.includes('G')));
    });
  }

  private normalizeNum(val: any, allowDecimal: boolean): number {
    const s = String(val).replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '') || '0';
    const n = allowDecimal ? parseFloat(s) : parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  }

  private loadLog(): void {
    this.nutritionService.getNutritionLog(this.dateStr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(log => this.log = log);
  }
}
