import { Component, DestroyRef, OnInit, OnDestroy, AfterViewInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, switchMap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { WorkoutService } from '../../../core/services/workout.service';
import { StrengthDataPoint } from '../../../core/models/analytics.model';
import { MacroTrendPoint } from '../../../core/models/nutrition.model';
import { WaterTrendPoint } from '../../../core/models/water.model';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
    NgxChartsModule,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="page" [class.single-column]="isSingleColumnLayout" [class.compact-height]="isCompactHeightLayout" #pageContainer>
      <div class="page-header" #pageHeader>
        <h1>Analytics</h1>
        <div class="controls-row">
          <mat-button-toggle-group name="rangeToggle" [(value)]="selectedDays" (change)="onDaysChange($event)">
            <mat-button-toggle [value]="7">7D</mat-button-toggle>
            <mat-button-toggle [value]="30">30D</mat-button-toggle>
            <mat-button-toggle [value]="60">60D</mat-button-toggle>
            <mat-button-toggle [value]="-1">Custom</mat-button-toggle>
          </mat-button-toggle-group>
          @if (selectedDays === -1) {
            <mat-form-field appearance="outline" class="custom-range-field">
              <mat-label>Date range</mat-label>
              <mat-date-range-input [rangePicker]="picker">
                <input matStartDate placeholder="Start date" [(ngModel)]="customStartDate" (dateChange)="onCustomRangeChange()">
                <input matEndDate placeholder="End date" [(ngModel)]="customEndDate" (dateChange)="onCustomRangeChange()">
              </mat-date-range-input>
              <mat-datepicker-toggle matIconSuffix [for]="picker"><mat-icon svgIcon="mx-calendar"></mat-icon></mat-datepicker-toggle>
              <mat-date-range-picker #picker></mat-date-range-picker>
            </mat-form-field>
          }
        </div>
      </div>

      <div class="analytics-grid">
        <mat-card class="chart-card strength-card">
          <div class="chart-card-header chart-card-header-strength">
            <div class="chart-card-title-group">
              <h3>Strength Progress</h3>
              @if (exerciseNames.length === 0) {
                <p class="chart-card-helper">Log workouts to unlock your exercise list.</p>
              }
            </div>
            <mat-form-field appearance="outline" class="exercise-select">
              <mat-label>Exercise</mat-label>
              <mat-select [(value)]="selectedExercise" (selectionChange)="loadStrengthData()" [disabled]="exerciseNames.length === 0">
                @for (name of exerciseNames; track name) {
                  <mat-option [value]="name">{{ name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          @if (strengthChartLoading) {
            <div class="chart-loading" [style.width.px]="gridChartWidth" [style.height.px]="chartViewHeight" [style.min-height.px]="chartViewHeight">
              <app-loading-spinner></app-loading-spinner>
            </div>
          } @else if (strengthChartData.length > 0 && strengthChartData[0].series.length > 0) {
            <div class="chart-container" [style.min-height.px]="chartViewHeight">
              <ngx-charts-line-chart
                [results]="strengthChartData"
                [view]="[gridChartWidth, chartViewHeight]"
                [scheme]="$any(chartScheme)"
                [xAxis]="true"
                [yAxis]="true"
                [showXAxisLabel]="false"
                [showYAxisLabel]="true"
                yAxisLabel="Weight (lbs)"
                [yAxisTickFormatting]="formatYAxis"
                [autoScale]="true"
                [roundDomains]="false"
                [yScaleMax]="strengthYMax"
                [xScaleMin]="$any(xAxisMin)"
                [xScaleMax]="$any(xAxisMax)"
                [xAxisTicks]="xAxisTicks"
                [xAxisTickFormatting]="formatDateAxis"
                [timeline]="false"
                [animations]="false">
                <ng-template #tooltipTemplate let-model="model">
                  <span class="chart-tooltip-date">{{ tooltipDate(model) }}</span>
                  <span class="chart-tooltip-value">{{ tooltipSeriesName(model, 'Weight') }}: {{ tooltipValue(model) }} lbs</span>
                </ng-template>
                <ng-template #seriesTooltipTemplate let-model="model">
                  <span class="chart-tooltip-date">{{ tooltipDate(model) }}</span>
                  <span class="chart-tooltip-value">{{ tooltipSeriesName(model, 'Weight') }}: {{ tooltipValue(model) }} lbs</span>
                </ng-template>
              </ngx-charts-line-chart>
            </div>
          } @else {
            <app-empty-state
              svgIcon="mx-chart-line"
              title="No data yet"
              message="Log workouts to see strength progress." />
          }
        </mat-card>

        <mat-card class="chart-card calorie-card">
          <div class="chart-card-header chart-card-header-simple">
            <div class="chart-card-title-group">
              <h3>Calorie Trends</h3>
            </div>
          </div>
          @if (macroChartLoading) {
            <div class="chart-loading" [style.width.px]="gridChartWidth" [style.height.px]="chartViewHeight" [style.min-height.px]="chartViewHeight">
              <app-loading-spinner></app-loading-spinner>
            </div>
          } @else if (calorieChartData.length > 0 && calorieChartData[0].series.length >= 1) {
            <div class="chart-container" [style.min-height.px]="chartViewHeight">
              <ngx-charts-line-chart
                [results]="calorieChartData"
                [view]="[gridChartWidth, chartViewHeight]"
                [scheme]="$any(calorieScheme)"
                [xAxis]="true"
                [yAxis]="true"
                [showXAxisLabel]="false"
                [showYAxisLabel]="true"
                yAxisLabel="Calories"
                [autoScale]="true"
                [roundDomains]="false"
                [yScaleMax]="calorieYMax"
                [xScaleMin]="$any(xAxisMin)"
                [xScaleMax]="$any(xAxisMax)"
                [xAxisTicks]="xAxisTicks"
                [xAxisTickFormatting]="formatDateAxis"
                [yAxisTickFormatting]="formatCalories"
                [timeline]="false"
                [animations]="false">
                <ng-template #tooltipTemplate let-model="model">
                  <span class="chart-tooltip-date">{{ tooltipDate(model) }}</span>
                  <span class="chart-tooltip-value">{{ tooltipSeriesName(model, 'Calories') }}: {{ tooltipValue(model) }} cal</span>
                </ng-template>
                <ng-template #seriesTooltipTemplate let-model="model">
                  <span class="chart-tooltip-date">{{ tooltipDate(model) }}</span>
                  <span class="chart-tooltip-value">{{ tooltipSeriesName(model, 'Calories') }}: {{ tooltipValue(model) }} cal</span>
                </ng-template>
              </ngx-charts-line-chart>
            </div>
          } @else if (!macroChartLoading) {
            <app-empty-state
              svgIcon="mx-utensils"
              title="No data yet"
              message="Log nutrition to see calorie trends." />
          }
        </mat-card>

        <mat-card class="chart-card protein-card">
          <div class="chart-card-header chart-card-header-simple">
            <div class="chart-card-title-group">
              <h3>Protein Intake</h3>
            </div>
          </div>
          @if (macroChartLoading) {
            <div class="chart-loading" [style.width.px]="gridChartWidth" [style.height.px]="chartViewHeight" [style.min-height.px]="chartViewHeight">
              <app-loading-spinner></app-loading-spinner>
            </div>
          } @else if (proteinChartData.length > 0 && proteinChartData[0].series.length >= 1) {
            <div class="chart-container" [style.min-height.px]="chartViewHeight">
              <ngx-charts-line-chart
                [results]="proteinChartData"
                [activeEntries]="proteinChartData"
                [view]="[gridChartWidth, chartViewHeight]"
                [scheme]="$any(proteinScheme)"
                [xAxis]="true"
                [yAxis]="true"
                [showXAxisLabel]="false"
                [showYAxisLabel]="true"
                yAxisLabel="Grams"
                [autoScale]="true"
                [roundDomains]="false"
                [yScaleMax]="proteinYMax"
                [xScaleMin]="$any(xAxisMin)"
                [xScaleMax]="$any(xAxisMax)"
                [xAxisTicks]="xAxisTicks"
                [xAxisTickFormatting]="formatDateAxis"
                [timeline]="false"
                [animations]="false">
                <ng-template #tooltipTemplate let-model="model">
                  <span class="chart-tooltip-date">{{ tooltipDate(model) }}</span>
                  <span class="chart-tooltip-value">{{ tooltipSeriesName(model, 'Protein') }}: {{ tooltipValue(model) }}g</span>
                </ng-template>
                <ng-template #seriesTooltipTemplate let-model="model">
                  <span class="chart-tooltip-date">{{ tooltipDate(model) }}</span>
                  <span class="chart-tooltip-value">{{ tooltipSeriesName(model, 'Protein') }}: {{ tooltipValue(model) }}g</span>
                </ng-template>
              </ngx-charts-line-chart>
            </div>
          } @else if (!macroChartLoading) {
            <app-empty-state
              svgIcon="mx-utensils"
              title="No data yet"
              message="Log nutrition to see protein trends." />
          }
        </mat-card>

        <mat-card class="chart-card water-card">
          <div class="chart-card-header chart-card-header-simple">
            <div class="chart-card-title-group">
              <h3>Water Consistency</h3>
            </div>
          </div>
          @if (waterChartLoading) {
            <div class="chart-loading" [style.width.px]="gridChartWidth" [style.height.px]="chartViewHeight" [style.min-height.px]="chartViewHeight">
              <app-loading-spinner></app-loading-spinner>
            </div>
          } @else if (waterChartData.length > 0 && waterChartData[0].series.length >= 1) {
            <div class="chart-container" [style.min-height.px]="chartViewHeight">
              <ngx-charts-line-chart
                [results]="waterChartData"
                [activeEntries]="waterChartData"
                [view]="[gridChartWidth, chartViewHeight]"
                [scheme]="$any(waterScheme)"
                [xAxis]="true"
                [yAxis]="true"
                [showXAxisLabel]="false"
                [showYAxisLabel]="true"
                yAxisLabel="Ounces"
                [yAxisTickFormatting]="formatYAxis"
                [autoScale]="true"
                [roundDomains]="false"
                [yScaleMax]="waterYMax"
                [xScaleMin]="$any(xAxisMin)"
                [xScaleMax]="$any(xAxisMax)"
                [xAxisTicks]="xAxisTicks"
                [xAxisTickFormatting]="formatDateAxis"
                [timeline]="false"
                [animations]="false">
                <ng-template #tooltipTemplate let-model="model">
                  <span class="chart-tooltip-date">{{ tooltipDate(model) }}</span>
                  <span class="chart-tooltip-value">{{ tooltipSeriesName(model, 'Water') }}: {{ tooltipValue(model) }} oz</span>
                </ng-template>
                <ng-template #seriesTooltipTemplate let-model="model">
                  <span class="chart-tooltip-date">{{ tooltipDate(model) }}</span>
                  <span class="chart-tooltip-value">{{ tooltipSeriesName(model, 'Water') }}: {{ tooltipValue(model) }} oz</span>
                </ng-template>
              </ngx-charts-line-chart>
            </div>
          } @else if (!waterChartLoading) {
            <app-empty-state
              svgIcon="mx-droplet"
              title="No data yet"
              message="Log water intake to see consistency trends." />
          }
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 0; height: 100%; overflow: hidden; }
    .page { width: 100%; max-width: 1120px; margin: 0 auto; display: flex; flex-direction: column; min-height: 0; height: 100%; box-sizing: border-box; overflow: hidden; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .controls-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .custom-range-field {
      width: 260px;
    }
    ::ng-deep .custom-range-field .mat-mdc-text-field-wrapper {
      background: rgba(255,255,255,0.04) !important;
      border-radius: 8px;
    }
    ::ng-deep .custom-range-field .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
    ::ng-deep .custom-range-field .mat-date-range-input-inner {
      color: var(--text-primary) !important;
    }
    ::ng-deep .custom-range-field .mat-date-range-input-separator {
      color: var(--text-muted) !important;
    }
    ::ng-deep .custom-range-field .mat-datepicker-toggle {
      color: var(--text-muted) !important;
    }
    ::ng-deep .custom-range-field .mat-datepicker-toggle:hover {
      color: var(--accent) !important;
    }
    ::ng-deep .custom-range-field .mat-datepicker-toggle .mat-icon {
      width: 24px !important;
      height: 24px !important;
      font-size: 24px !important;
    }
    h1 { color: var(--text-primary); font-size: 24px; font-weight: 700; margin: 0; }
    ::ng-deep .mat-button-toggle-group {
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 8px !important;
    }
    ::ng-deep .mat-button-toggle {
      background: transparent !important;
      color: var(--text-muted) !important;
    }
    ::ng-deep .mat-button-toggle-checked {
      background: var(--accent) !important;
      color: #0D0D0D !important;
    }
    ::ng-deep .mat-button-toggle-checked .mat-icon {
      color: #0D0D0D !important;
    }
    ::ng-deep .mat-button-toggle .mat-pseudo-checkbox {
      display: none !important;
    }
    ::ng-deep .mat-button-toggle-checked .mat-button-toggle-label-content {
      font-weight: 700;
    }
    .exercise-select .mat-mdc-form-field-subscript-wrapper { display: none; }
    ::ng-deep .exercise-select .mat-mdc-text-field-wrapper {
      background: rgba(255,255,255,0.04) !important;
      border-radius: 4px;
    }
    ::ng-deep .exercise-select .mat-mdc-form-field .mat-mdc-input-element,
    ::ng-deep .exercise-select .mat-mdc-select-value,
    ::ng-deep .exercise-select .mat-mdc-select-value-text {
      color: var(--text-primary) !important;
    }
    ::ng-deep .exercise-select .mdc-notched-outline .mdc-notched-outline__leading,
    ::ng-deep .exercise-select .mdc-notched-outline .mdc-notched-outline__notch,
    ::ng-deep .exercise-select .mdc-notched-outline .mdc-notched-outline__trailing {
      border-color: rgba(255,255,255,0.12) !important;
    }
    ::ng-deep .exercise-select.mdc-text-field--focused .mdc-notched-outline .mdc-notched-outline__leading,
    ::ng-deep .exercise-select.mdc-text-field--focused .mdc-notched-outline .mdc-notched-outline__notch,
    ::ng-deep .exercise-select.mdc-text-field--focused .mdc-notched-outline .mdc-notched-outline__trailing {
      border-color: var(--accent) !important;
    }
    ::ng-deep .exercise-select .mat-mdc-floating-label { color: var(--text-muted) !important; }
    ::ng-deep .exercise-select.mdc-text-field--focused .mat-mdc-floating-label { color: var(--accent) !important; }
    ::ng-deep .exercise-select input, ::ng-deep .exercise-select .mat-mdc-select-min-line {
      caret-color: var(--accent) !important;
    }
    .chart-card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 0;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      height: 100%;
    }
    .chart-loading {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 244px;
    }
    .chart-container {
      min-height: 244px;
      overflow: hidden;
    }
    .chart-tooltip-date { display: block; font-weight: 600; margin-bottom: 2px; }
    .chart-tooltip-value { display: block; font-size: 12px; color: var(--text-muted); }
    h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .single-data-point {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      text-align: center;
      background: rgba(255,255,255,0.02);
      border-radius: 8px;
      border: 1px dashed rgba(255,255,255,0.1);
    }
    .single-data-value {
      font-size: 42px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .single-data-label {
      font-size: 15px;
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    .single-data-hint {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
    }
    .chart-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
      min-height: 60px;
    }
    .chart-card-header h3 { margin: 0; }
    .chart-card-title-group { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .chart-card-header-strength { align-items: flex-start; }
    .chart-card-header-simple { align-items: flex-start; }
    .chart-card-helper { margin: 0; font-size: 12px; line-height: 1.4; color: var(--text-muted); max-width: 280px; }
    .exercise-select { width: 208px; flex-shrink: 0; margin-left: auto; }
    ::ng-deep .exercise-select .mat-mdc-form-field-focus-overlay { background: rgba(255,255,255,0.04) !important; }
    ::ng-deep .exercise-select .mat-mdc-select-arrow-wrapper .mat-mdc-select-arrow { color: var(--text-muted) !important; }
    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: stretch;
      grid-auto-rows: 1fr;
      flex: 1;
      min-height: 0;
    }
    .page.compact-height .page-header { margin-bottom: 12px; gap: 10px; }
    .page.compact-height .controls-row { gap: 12px; }
    .page.compact-height .analytics-grid { gap: 12px; }
    .page.compact-height .chart-card { padding: 14px 16px 16px; }
    .page.compact-height .chart-card-header { gap: 8px; margin-bottom: 10px; min-height: 48px; }
    .page.compact-height .chart-card-helper { font-size: 11px; line-height: 1.3; }
    .page.compact-height .exercise-select { width: 196px; }
    .page.single-column .controls-row,
    .page.single-column .custom-range-field,
    .page.single-column .exercise-select { width: 100%; margin-left: 0; }
    .page.single-column .analytics-grid { grid-template-columns: 1fr; }
    ::ng-deep .ngx-charts {
      display: block;
      width: 100% !important;
    }
    ::ng-deep .ngx-charts text { fill: var(--text-muted) !important; font-size: 11px !important; }
    ::ng-deep .ngx-charts .gridline-path { stroke: rgba(255,255,255,0.06) !important; }
    ::ng-deep .ngx-charts .circle-series circle {
      opacity: 1 !important;
      r: 5 !important;
      transition: none !important;
      pointer-events: all !important;
    }
    ::ng-deep .ngx-charts .line-series path {
      stroke-width: 3px !important;
      transition: none !important;
    }
    @media (max-width: 920px) {
      :host { height: auto; min-height: 100%; overflow: visible; }
      .page { height: auto; overflow: visible; padding-bottom: 16px; }
      .controls-row,
      .custom-range-field,
      .exercise-select { width: 100%; margin-left: 0; }
      .analytics-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .page-header { align-items: flex-start; }
    }
  `],
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private resizeObserver: ResizeObserver | null = null;

  @ViewChild('pageContainer') pageContainer?: ElementRef<HTMLElement>;
  @ViewChild('pageHeader') pageHeader?: ElementRef<HTMLElement>;

  strengthChartLoading = false;
  macroChartLoading = false;
  waterChartLoading = false;

  exerciseNames: string[] = [];
  selectedExercise = '';
  selectedDays = 30;
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  strengthData: StrengthDataPoint[] = [];
  macroTrends: MacroTrendPoint[] = [];
  waterTrends: WaterTrendPoint[] = [];

  strengthChartData: any[] = [];
  calorieChartData: any[] = [];
  proteinChartData: any[] = [];
  waterChartData: any[] = [];

  pageWidth = 1000;
  availableContentHeight = 0;
  pageHeaderHeight = 0;
  chartWidth = 700;
  chartHalfWidth = 440;
  readonly maxChartViewHeight = 244;
  readonly minChartViewHeight = 170;
  readonly singleColumnBreakpoint = 920;
  private strengthRequestId = 0;

  /** ngx-charts accepts { domain: string[] } at runtime; typings expect string | Color */
  readonly chartScheme: any = { domain: ['#FFEB3B', '#888888', '#FFFFFF'] };
  readonly calorieScheme: any = { domain: ['#9C27B0'] };
  readonly proteinScheme: any = { domain: ['#FF9800'] };
  readonly waterScheme: any = { domain: ['#00BCD4'] };

  get gridChartWidth(): number {
    return this.isSingleColumnLayout ? this.chartWidth : this.chartHalfWidth;
  }

  get isSingleColumnLayout(): boolean {
    return this.pageWidth <= this.singleColumnBreakpoint;
  }

  get chartViewHeight(): number {
    if (this.isSingleColumnLayout) return this.maxChartViewHeight;
    const availableHeight = this.availableContentHeight || 0;
    const headerHeight = this.pageHeaderHeight || 72;
    if (availableHeight <= 0) return this.maxChartViewHeight;
    const rowHeight = (availableHeight - headerHeight - 12 - 12 - 8) / 2;
    const fittedHeight = Math.floor(rowHeight - 104);
    return Math.max(this.minChartViewHeight, Math.min(this.maxChartViewHeight, fittedHeight));
  }

  get isCompactHeightLayout(): boolean {
    return !this.isSingleColumnLayout && this.chartViewHeight < this.maxChartViewHeight;
  }

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly workoutService: WorkoutService,
  ) {}

  private readonly range$ = new Subject<{ days: number; endDate: string }>();

  ngOnInit(): void {
    this.updateAxisBounds();

    this.workoutService.getExerciseNames()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(names => {
        if (names.length > 0) {
          this.exerciseNames = names;
          this.selectedExercise = names[0];
          this.loadStrengthData();
        } else {
          this.exerciseNames = [];
          this.selectedExercise = '';
        }
        this.cdr.markForCheck();
      });

    this.range$.pipe(
      switchMap(({ days, endDate }) => this.analyticsService.getWaterTrends(days, endDate)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({ next: data => this.applyWaterData(data), error: err => this.applyWaterError(err) });

    this.range$.pipe(
      switchMap(({ days, endDate }) => this.analyticsService.getMacroTrends(days, endDate)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({ next: data => this.applyMacroData(data), error: err => this.applyMacroError(err) });

    this.updateAxisBounds();
    this.range$.next({ days: this.activeDays, endDate: this.activeEndDate });
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => this.setupChartResizeObserver());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private setupChartResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined' || !this.pageContainer?.nativeElement) return;
    const el = this.pageContainer.nativeElement;
    const contentEl = el.parentElement as HTMLElement | null;
    const headerEl = this.pageHeader?.nativeElement ?? null;
    this.updateChartMetrics(el, contentEl, headerEl);
    this.resizeObserver = new ResizeObserver(() => {
      this.updateChartMetrics(el, contentEl, headerEl);
      this.cdr.markForCheck();
    });
    this.resizeObserver.observe(el);
    if (contentEl) this.resizeObserver.observe(contentEl);
    if (headerEl) this.resizeObserver.observe(headerEl);
  }

  private updateChartMetrics(el: HTMLElement, contentEl: HTMLElement | null, headerEl: HTMLElement | null): void {
    const w = el.clientWidth || el.offsetWidth || 0;
    if (w > 0) {
      this.pageWidth = w;
      this.chartWidth = Math.max(220, Math.min(w - 96, 1040));
      this.chartHalfWidth = Math.max(220, Math.min((w - 144) / 2, 520));
    }
    const contentHeight = el.clientHeight || contentEl?.clientHeight || el.parentElement?.clientHeight || 0;
    if (contentHeight > 0) {
      this.availableContentHeight = contentHeight;
    }
    const headerHeight = headerEl?.offsetHeight || 0;
    if (headerHeight > 0) {
      this.pageHeaderHeight = headerHeight;
    }
  }

  onDaysChange(event?: { value: number }): void {
    const days = event?.value ?? this.selectedDays;
    this.selectedDays = days;
    if (days !== -1 || (this.customStartDate && this.customEndDate)) {
      this.updateAxisBounds();
      this.loadStrengthData(true);
      const params = { days: this.activeDays, endDate: this.activeEndDate };
      setTimeout(() => this.range$.next(params), 0);
      this.cdr.detectChanges();
    }
  }

  onCustomRangeChange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.updateAxisBounds();
      this.loadStrengthData(true);
      const params = { days: this.activeDays, endDate: this.activeEndDate };
      setTimeout(() => this.range$.next(params), 0);
      this.cdr.detectChanges();
    }
  }

  /** Parse date string to Date at noon for consistent tooltip matching across chart area hover. */
  private parseDateStr(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
  }

  loadStrengthData(skipLoadingState = false): void {
    if (!this.selectedExercise) {
      this.strengthChartLoading = false;
      this.cdr.detectChanges();
      return;
    }
    if (!skipLoadingState) this.strengthChartLoading = true;
    const reqId = ++this.strengthRequestId;
    this.analyticsService.getStrengthProgress(this.selectedExercise, this.activeDays)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          if (reqId !== this.strengthRequestId) return;
          this.strengthData = data;
          const dataByDate = new Map<string, number>();
          data.forEach(d => dataByDate.set(d.date, d.estimatedOneRepMax));
          const strSeries = this.buildSeriesForRange(dataByDate);
          this.strengthChartData = [{ name: this.selectedExercise, series: strSeries }];
          this.strengthChartLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          if (reqId !== this.strengthRequestId) return;
          this.strengthChartLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  /** Y-axis max from data so the chart scales to what the user logged (e.g. 24oz -> axis ~30). */
  get waterYMax(): number {
    if (this.waterTrends.length === 0) return 64;
    const max = Math.max(...this.waterTrends.map(d => d.totalOz), 1);
    return Math.ceil(max * 1.2) || 64;
  }

  get proteinYMax(): number {
    if (this.macroTrends.length === 0) return 100;
    const max = Math.max(...this.macroTrends.map(d => d.proteinG), 1);
    return Math.ceil(max * 1.2) || 100;
  }

  get calorieYMax(): number {
    if (this.macroTrends.length === 0) return 2000;
    const max = Math.max(...this.macroTrends.map(d => d.calories), 100);
    return Math.ceil(max * 1.1) || 2000;
  }

  get strengthYMax(): number {
    if (this.strengthData.length === 0) return 200;
    const max = Math.max(...this.strengthData.map(d => d.estimatedOneRepMax), 10);
    return Math.ceil(max * 1.15) || 200;
  }

  get activeDays(): number {
    if (this.selectedDays === -1 && this.customStartDate && this.customEndDate) {
      const diffTime = Math.abs(this.customEndDate.getTime() - this.customStartDate.getTime());
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    }
    
    const end = new Date();
    const start = new Date();
    if (this.selectedDays === 30) {
      start.setMonth(start.getMonth() - 1);
    } else if (this.selectedDays === 60) {
      start.setMonth(start.getMonth() - 2);
    } else {
      start.setDate(start.getDate() - this.selectedDays);
    }
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  get activeEndDate(): string {
    if (this.selectedDays === -1 && this.customEndDate) {
      const d = new Date(this.customEndDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  xAxisMin: Date = new Date();
  xAxisMax: Date = new Date();
  xAxisTicks: Date[] = [];

  private updateAxisBounds(): void {
    let start: Date;
    let end: Date;

    if (this.selectedDays === -1 && this.customEndDate) {
      end = new Date(this.customEndDate);
    } else {
      end = new Date();
    }
    end.setHours(23, 59, 59, 999);
    
    // Always create a completely fresh date instance to break references
    this.xAxisMax = new Date(end.getTime());

    if (this.selectedDays === -1 && this.customStartDate) {
      start = new Date(this.customStartDate);
    } else {
      start = new Date(end.getTime());
      if (this.selectedDays === 30) {
        start.setMonth(start.getMonth() - 1);
      } else if (this.selectedDays === 60) {
        start.setMonth(start.getMonth() - 2);
      } else {
        start.setDate(start.getDate() - this.selectedDays);
      }
    }
    start.setHours(0, 0, 0, 0);
    
    // Always create a completely fresh date instance to break references
    this.xAxisMin = new Date(start.getTime());

    const ticks: Date[] = [];
    let stepDays = 1;
    if (this.selectedDays === 7) stepDays = 1;
    else if (this.selectedDays === 30) stepDays = 5;
    else if (this.selectedDays === 60) stepDays = 10;
    else {
      // Calculate active days for custom range accurately to ensure proper spacing
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const customDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
      stepDays = Math.max(1, Math.floor(customDays / 6)); // ensure roughly 6 ticks show up on custom
    }

    // Always reset the loop variable to the start date cleanly
    const current = new Date(start.getTime());
    
    // Create a boundary for ticks that stops at the very beginning of the end day
    const tickEnd = new Date(end.getTime());
    tickEnd.setHours(0, 0, 0, 0);

    while (current <= tickEnd) {
      ticks.push(new Date(current.getTime()));
      current.setDate(current.getDate() + stepDays);
    }
    
    // Ensure the very last day's start is ALWAYS included
    if (ticks.length > 0 && ticks[ticks.length - 1].getTime() !== tickEnd.getTime()) {
        ticks.push(new Date(tickEnd.getTime()));
    }
    
    // Sort array just to be perfectly safe
    ticks.sort((a, b) => a.getTime() - b.getTime());
    
    // Filter out ticks that are too close to each other to prevent text overlap (except start/end)
    const filteredTicks = [ticks[0]];
    const minDiffMs = (stepDays / 2) * 24 * 60 * 60 * 1000;
    
    for (let i = 1; i < ticks.length - 1; i++) {
       const prev = filteredTicks[filteredTicks.length - 1];
       const curr = ticks[i];
       const next = ticks[ticks.length - 1]; // the end date
       
       // Only add if it's far enough from previous AND far enough from the end date
       if ((curr.getTime() - prev.getTime() >= minDiffMs) && 
           (next.getTime() - curr.getTime() >= minDiffMs)) {
           filteredTicks.push(curr);
       }
    }
    
    if (ticks.length > 1 && filteredTicks[filteredTicks.length - 1].getTime() !== ticks[ticks.length - 1].getTime()) {
        filteredTicks.push(ticks[ticks.length - 1]);
    }
    
    this.xAxisTicks = filteredTicks;
  }

  /** Format date for tooltip so users see which day they hit 0 (or any value). */
  formatTooltipDate(val: any): string {
    if (val == null || val === undefined) return '';
    const date = val instanceof Date ? val : new Date(val);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Get date for tooltip - tries name then label (ngx-charts model varies by point value). */
  tooltipDate(model: any): string {
    const m = Array.isArray(model) ? model[0] : model;
    return this.formatTooltipDate(m?.name ?? m?.label) || '--';
  }

  /** Get value for tooltip - handles both single model and array (chart area hover vs dot hover). */
  tooltipValue(model: any): number | string {
    const m = Array.isArray(model) ? model[0] : model;
    const val = m?.value;
    return val != null ? val : '--';
  }

  /** Get series name for tooltip - handles both single model and array. */
  tooltipSeriesName(model: any, fallback: string): string {
    const m = Array.isArray(model) ? model[0] : model;
    return m?.seriesName || m?.series || fallback;
  }

  formatDateAxis = (val: any): string => {
    if (val == null || val === undefined) return '';
    let date: Date;
    if (val instanceof Date) {
      date = val;
    } else if (typeof val === 'number' || typeof val === 'string') {
      date = new Date(val);
    } else {
      return '';
    }
    if (!isNaN(date.getTime())) {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    return '';
  };

  /** Format y-axis labels for calories (e.g. 2000 -> 2k) */
  formatCalories(val: number): string {
    if (val == null || val === undefined || isNaN(val)) return '';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return String(val);
  }

  /** Safe y-axis formatter - prevents "undefined" during chart transitions */
  formatYAxis = (val: any): string => {
    if (val == null || val === undefined || isNaN(Number(val))) return '';
    return String(val);
  };

  private applyMacroData(data: any[]): void {
    this.macroTrends = (data || []).map(d => ({
      date: d.date,
      calories: Number(d.calories) || 0,
      proteinG: Number(d.proteinG) || 0,
      carbsG: Number(d.carbsG) || 0,
      fatG: Number(d.fatG) || 0,
    }));
    let calSeries = this.macroTrends.map(d => ({ name: this.parseDateStr(d.date), value: d.calories }));
    if (calSeries.length === 1) {
      calSeries.push({ name: new Date(calSeries[0].name.getTime() + 10), value: calSeries[0].value });
    }
    this.calorieChartData = [{ name: 'Calories', series: calSeries }];
    let proSeries = this.macroTrends.map(d => ({ name: this.parseDateStr(d.date), value: d.proteinG }));
    if (proSeries.length === 1) {
      proSeries.push({ name: new Date(proSeries[0].name.getTime() + 10), value: proSeries[0].value });
    }
    this.proteinChartData = [{ name: 'Protein', series: proSeries }];
    this.macroChartLoading = false;
    this.cdr.detectChanges();
  }

  /** Build one point per day from xAxisMin to xAxisMax for consistent tooltip matching (same as strength). */
  private buildSeriesForRange(dataByDate: Map<string, number>): { name: Date; value: number }[] {
    const series: { name: Date; value: number }[] = [];
    const current = new Date(this.xAxisMin.getTime());
    current.setHours(0, 0, 0, 0);
    const end = new Date(this.xAxisMax.getTime());
    end.setHours(23, 59, 59, 999);
    while (current <= end) {
      const y = current.getFullYear();
      const m = current.getMonth();
      const d = current.getDate();
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      series.push({ name: this.parseDateStr(dateStr), value: dataByDate.get(dateStr) ?? 0 });
      current.setDate(d + 1);
    }
    if (series.length === 1) {
      series.push({ name: new Date(series[0].name.getTime() + 10), value: series[0].value });
    }
    return series;
  }

  private applyMacroError(err: any): void {
    this.macroTrends = [];
    this.calorieChartData = [];
    this.proteinChartData = [];
    this.macroChartLoading = false;
    this.cdr.detectChanges();
    console.error('Analytics: getMacroTrends failed', err);
  }

  private applyWaterData(data: any[]): void {
    this.waterTrends = (data || []).map(d => ({
      date: d.date,
      totalOz: Number(d.totalOz) || 0,
      goalOz: Number(d.goalOz) || 64,
      goalMet: !!d.goalMet,
    }));
    let waterSeries = this.waterTrends.map(d => ({ name: this.parseDateStr(d.date), value: d.totalOz }));
    if (waterSeries.length === 1) {
      waterSeries.push({ name: new Date(waterSeries[0].name.getTime() + 10), value: waterSeries[0].value });
    }
    this.waterChartData = [{ name: 'Water', series: waterSeries }];
    this.waterChartLoading = false;
    this.cdr.detectChanges();
  }

  private applyWaterError(err: any): void {
    this.waterTrends = [];
    this.waterChartData = [];
    this.waterChartLoading = false;
    this.cdr.detectChanges();
    console.error('Analytics: getWaterTrends failed', err);
  }
}








