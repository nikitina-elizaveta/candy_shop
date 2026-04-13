

import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../services/api.service';
Chart.register(...registerables);

// Палитры и настройки
const CHART_COLORS = {
  indigo:    { border: 'rgba(99, 102, 241, 1)',   bg: 'rgba(99, 102, 241, 0.12)'  },
  cyan:      { border: 'rgba(6, 182, 212, 1)',    bg: 'rgba(6, 182, 212, 0.12)'   },
  pink:      { border: 'rgba(236, 72, 153, 1)',   bg: 'rgba(236, 72, 153, 0.12)'  },
  amber:     { border: 'rgba(245, 158, 11, 1)',   bg: 'rgba(245, 158, 11, 0.12)'  },
  emerald:   { border: 'rgba(16, 185, 129, 1)',   bg: 'rgba(16, 185, 129, 0.12)'  },
  violet:    { border: 'rgba(139, 92, 246, 1)',   bg: 'rgba(139, 92, 246, 0.12)'  },
};

const PIE_COLORS = [
  'rgba(99, 102, 241, 0.8)', 'rgba(6, 182, 212, 0.8)', 'rgba(236, 72, 153, 0.8)',
  'rgba(245, 158, 11, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(139, 92, 246, 0.8)',
  'rgba(244, 114, 182, 0.8)', 'rgba(34, 211, 238, 0.8)',
];

const CHART_FONT = { family: "'Inter', sans-serif" };

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  // === Canvas refs ===
  @ViewChild('salesChart') salesChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ingredientChart') ingredientChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('occasionChart') occasionChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ingredientPieChart') ingredientPieCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('occasionPieChart') occasionPieCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('popularChart') popularCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('averageCheckChart') averageCheckCanvas!: ElementRef<HTMLCanvasElement>;

  // === Chart instances ===
  salesChart: Chart | null = null;
  ingredientChart: Chart | null = null;
  occasionChart: Chart | null = null;
  ingredientPieChart: any = null;
occasionPieChart: any = null;
  popularChart: Chart | null = null;
  averageCheckChart: Chart | null = null;

  // === Фильтры ===
  ingredientGroups: string[] = [];
  occasions: any[] = [];
  selectedIngredientGroup: string = '';
  selectedOccasionId: number = 0;

  // === Данные для статистики ===
  totalRevenue: number = 0;
  growthRate: number = 0;
  totalCustomers: number = 0;
  ordersToday: number = 0;

  // === Данные для таблиц и графиков ===
  unpopularProducts: any[] = [];
  topFilters: any[] = [];
  averageCheckData: any[] = [];
  popularProducts: any[] = [];

  // === Переменные для периодов (каждый график/таблица имеет свой период) ===
  // Период для общего графика продаж
  selectedPeriodSales: string = 'all_time';
  startDateSales: string = '';
  endDateSales: string = '';

  // Период для линейного графика по ингредиентам
  selectedPeriodIngredientLine: string = 'all_time';
  startDateIngredientLine: string = '';
  endDateIngredientLine: string = '';

  // Период для линейного графика по праздникам
  selectedPeriodOccasionLine: string = 'all_time';
  startDateOccasionLine: string = '';
  endDateOccasionLine: string = '';

  // Период для популярных товаров (столбчатая диаграмма)
  selectedPeriodPopular: string = 'all_time';
  startDatePopular: string = '';
  endDatePopular: string = '';

  // Период для среднего чека
  selectedPeriodAverage: string = 'all_time';
  startDateAverage: string = '';
  endDateAverage: string = '';

  // Период для непопулярных товаров (таблица)
  selectedPeriodUnpopular: string = 'all_time';
  startDateUnpopular: string = '';
  endDateUnpopular: string = '';

  // Период для статистики фильтров (таблица)
  selectedPeriodFilters: string = 'all_time';
  startDateFilters: string = '';
  endDateFilters: string = '';

  // Период для круговых диаграмм (по умолчанию последний месяц)
  selectedMonthForPie: string = 'latest'; // 'latest' или конкретный 'YYYY-MM'

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadFiltersData();
    this.loadSalesData();
    this.loadIngredientPieData(); // пока загружаем последний месяц
    this.loadOccasionPieData();
    this.loadPopularProducts();
    this.loadUnpopularProducts();
    this.loadFilterStats();
    this.loadAverageCheck();
    this.loadIngredientSalesData(this.selectedIngredientGroup);
    this.loadOccasionSalesData(this.selectedOccasionId);
  }

  ngAfterViewInit(): void {}

  // === ЗАГРУЗКА ДАННЫХ ===

  loadFiltersData(): void {
    this.api.getFilters().subscribe({
      next: (data) => {
        this.ingredientGroups = data.ingredientGroups;
        this.occasions = data.occasions;
        if (this.ingredientGroups.length) this.selectedIngredientGroup = this.ingredientGroups[0];
        if (this.occasions.length) this.selectedOccasionId = this.occasions[0].id;
        this.loadIngredientSalesData(this.selectedIngredientGroup);
        this.loadOccasionSalesData(this.selectedOccasionId);
      },
      error: (err) => console.error('Ошибка загрузки фильтров:', err)
    });
  }

  // === Методы обновления дат для каждого периода ===
  updateDateRangeSales(): void {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = new Date();
    switch (this.selectedPeriodSales) {
      case 'last_month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'last_3_months':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'last_6_months':
        start.setMonth(today.getMonth() - 6);
        break;
      case 'last_year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'all_time':
      default:
        this.startDateSales = '';
        this.endDateSales = '';
        return;
    }
    this.startDateSales = start.toISOString().split('T')[0];
    this.endDateSales = end;
  }

  updateDateRangeIngredientLine(): void {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = new Date();
    switch (this.selectedPeriodIngredientLine) {
      case 'last_month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'last_3_months':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'last_6_months':
        start.setMonth(today.getMonth() - 6);
        break;
      case 'last_year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'all_time':
      default:
        this.startDateIngredientLine = '';
        this.endDateIngredientLine = '';
        return;
    }
    this.startDateIngredientLine = start.toISOString().split('T')[0];
    this.endDateIngredientLine = end;
  }

  updateDateRangeOccasionLine(): void {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = new Date();
    switch (this.selectedPeriodOccasionLine) {
      case 'last_month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'last_3_months':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'last_6_months':
        start.setMonth(today.getMonth() - 6);
        break;
      case 'last_year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'all_time':
      default:
        this.startDateOccasionLine = '';
        this.endDateOccasionLine = '';
        return;
    }
    this.startDateOccasionLine = start.toISOString().split('T')[0];
    this.endDateOccasionLine = end;
  }

  updateDateRangePopular(): void {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = new Date();
    switch (this.selectedPeriodPopular) {
      case 'last_month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'last_3_months':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'last_6_months':
        start.setMonth(today.getMonth() - 6);
        break;
      case 'last_year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'all_time':
      default:
        this.startDatePopular = '';
        this.endDatePopular = '';
        return;
    }
    this.startDatePopular = start.toISOString().split('T')[0];
    this.endDatePopular = end;
  }

  updateDateRangeAverage(): void {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = new Date();
    switch (this.selectedPeriodAverage) {
      case 'last_month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'last_3_months':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'last_6_months':
        start.setMonth(today.getMonth() - 6);
        break;
      case 'last_year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'all_time':
      default:
        this.startDateAverage = '';
        this.endDateAverage = '';
        return;
    }
    this.startDateAverage = start.toISOString().split('T')[0];
    this.endDateAverage = end;
  }

  updateDateRangeUnpopular(): void {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = new Date();
    switch (this.selectedPeriodUnpopular) {
      case 'last_month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'last_3_months':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'last_6_months':
        start.setMonth(today.getMonth() - 6);
        break;
      case 'last_year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'all_time':
      default:
        this.startDateUnpopular = '';
        this.endDateUnpopular = '';
        return;
    }
    this.startDateUnpopular = start.toISOString().split('T')[0];
    this.endDateUnpopular = end;
  }

  updateDateRangeFilters(): void {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = new Date();
    switch (this.selectedPeriodFilters) {
      case 'last_month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'last_3_months':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'last_6_months':
        start.setMonth(today.getMonth() - 6);
        break;
      case 'last_year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'all_time':
      default:
        this.startDateFilters = '';
        this.endDateFilters = '';
        return;
    }
    this.startDateFilters = start.toISOString().split('T')[0];
    this.endDateFilters = end;
  }

  // === Загрузка продаж (общий график) ===
  loadSalesData(): void {
    this.api.getSalesByMonth(this.startDateSales, this.endDateSales).subscribe({
      next: (data) => {
        this.calculateStats(data);
        this.renderSalesChart(data);
      },
      error: (err) => console.error('Ошибка загрузки продаж:', err)
    });
  }

  // === Линейные графики по ингредиентам и праздникам ===
  loadIngredientSalesData(group: string): void {
    if (!group) return;
    this.api.getSalesByIngredientGroupOverTime(group, this.startDateIngredientLine, this.endDateIngredientLine).subscribe({
      next: (data) => {
        this.renderIngredientChart(data, group);
      },
      error: (err) => console.error(err)
    });
  }

  loadOccasionSalesData(occasionId: number): void {
    if (!occasionId) return;
    this.api.getSalesByOccasionOverTime(occasionId, this.startDateOccasionLine, this.endDateOccasionLine).subscribe({
      next: (data) => {
        const occasionName = this.occasions.find(o => o.id === occasionId)?.name || 'Праздник';
        this.renderOccasionChart(data, occasionName);
      },
      error: (err) => console.error(err)
    });
  }

  // === Круговые диаграммы (пока за последний месяц) ===
  loadIngredientPieData(): void {
    this.api.getSalesByIngredientGroupLastMonth().subscribe({
      next: (data) => this.renderIngredientPieChart(data),
      error: (err) => console.error(err)
    });
  }

  loadOccasionPieData(): void {
    this.api.getSalesByOccasionLastMonth().subscribe({
      next: (data) => this.renderOccasionPieChart(data),
      error: (err) => console.error(err)
    });
  }

  // === Популярные товары (столбчатая диаграмма) ===
  loadPopularProducts(): void {
    this.api.getPopularProductsByMonth(undefined, undefined).subscribe({
      next: (data) => {
        this.popularProducts = data;
        this.renderPopularChart(data);
      },
      error: (err) => console.error('Ошибка загрузки популярных товаров:', err)
    });
  }

  // === Непопулярные товары (таблица) ===
  loadUnpopularProducts(): void {
    // Для простоты пока не фильтруем по дате, можно добавить параметры start/end
    this.api.getUnpopularProducts(5).subscribe({
      next: (data) => this.unpopularProducts = data,
      error: (err) => console.error(err)
    });
  }

  // === Статистика фильтров ===
  loadFilterStats(): void {
    this.api.getFilterStats().subscribe({
      next: (data: any) => {
        this.topFilters = data.top || [];
      },
      error: (err) => console.error(err)
    });
  }

  // === Средний чек ===
  loadAverageCheck(): void {
    this.api.getAverageCheckByMonth(this.startDateAverage, this.endDateAverage).subscribe({
      next: (data) => {
        this.averageCheckData = data;
        this.renderAverageCheckChart();
      },
      error: (err) => console.error(err)
    });
  }

  // === РАСЧЁТ СТАТИСТИКИ (из данных продаж) ===
  calculateStats(salesData: any[]): void {
    if (!salesData || !salesData.length) return;
    this.totalRevenue = salesData.reduce((sum, item) => sum + (item.total || 0), 0);
    if (salesData.length >= 2) {
      const lastMonth = salesData[salesData.length - 1].total || 0;
      const prevMonth = salesData[salesData.length - 2].total || 0;
      this.growthRate = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0;
    }
    // Здесь можно вычислить количество клиентов и заказов, если эти поля приходят с бэкенда
    // Пока заглушки:
    this.totalCustomers = salesData.reduce((sum, item) => sum + (item.customers || 0), 0);
    this.ordersToday = salesData.length > 0 ? (salesData[salesData.length - 1].orders || 0) : 0;
  }

  // === ОБРАБОТЧИКИ ИЗМЕНЕНИЯ ПЕРИОДОВ ===
  onPeriodChangeSales(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPeriodSales = select.value;
    this.updateDateRangeSales();
    this.loadSalesData();
  }

  onPeriodChangeIngredientLine(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPeriodIngredientLine = select.value;
    this.updateDateRangeIngredientLine();
    this.loadIngredientSalesData(this.selectedIngredientGroup);
  }

  onPeriodChangeOccasionLine(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPeriodOccasionLine = select.value;
    this.updateDateRangeOccasionLine();
    this.loadOccasionSalesData(this.selectedOccasionId);
  }

  onPeriodChangePopular(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPeriodPopular = select.value;
    this.updateDateRangePopular();
    this.loadPopularProducts();
  }

  onPeriodChangeAverage(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPeriodAverage = select.value;
    this.updateDateRangeAverage();
    this.loadAverageCheck();
  }

  onPeriodChangeUnpopular(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPeriodUnpopular = select.value;
    this.updateDateRangeUnpopular();
    this.loadUnpopularProducts();
  }

  onPeriodChangeFilters(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPeriodFilters = select.value;
    this.updateDateRangeFilters();
    this.loadFilterStats();
  }

  // === Обработчики выбора ингредиента/праздника ===
  onIngredientGroupChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedIngredientGroup = select.value;
    this.loadIngredientSalesData(this.selectedIngredientGroup);
  }

  onOccasionChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedOccasionId = parseInt(select.value, 10);
    this.loadOccasionSalesData(this.selectedOccasionId);
  }

  // === ОТРИСОВКА ГРАФИКОВ (без изменений, но оставлены) ===
  private getChartOptions(titleText?: string): any {
    // ... (оставляем как было)
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { font: { ...CHART_FONT, size: 13 }, color: '#64748b' } },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          titleColor: '#1e293b',
          bodyColor: '#475569',
          borderColor: 'rgba(99, 102, 241, 0.15)',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          bodyFont: { ...CHART_FONT, size: 13 },
          titleFont: { ...CHART_FONT, size: 14, weight: '600' },
          boxPadding: 6,
        },
        ...(titleText ? {
          title: {
            display: true,
            text: titleText,
            font: { ...CHART_FONT, size: 15, weight: '600' },
            color: '#1e293b',
            padding: { bottom: 16 }
          }
        } : {}),
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.08)' },
          ticks: { font: { ...CHART_FONT, size: 12 }, color: '#94a3b8' },
          border: { display: false }
        },
        x: {
          grid: { display: false },
          ticks: { font: { ...CHART_FONT, size: 12 }, color: '#94a3b8' },
          border: { display: false }
        }
      }
    };
  }

  private getPieOptions(titleText: string): any {
    return {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            font: { ...CHART_FONT, size: 12 },
            color: '#64748b',
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          titleColor: '#1e293b',
          bodyColor: '#475569',
          borderColor: 'rgba(99, 102, 241, 0.15)',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          bodyFont: { ...CHART_FONT, size: 13 },
        },
        title: {
          display: true,
          text: titleText,
          font: { ...CHART_FONT, size: 15, weight: '600' },
          color: '#1e293b',
          padding: { bottom: 12 }
        }
      }
    };
  }

  private createGradient(ctx: CanvasRenderingContext2D, color: { border: string; bg: string }): CanvasGradient {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color.bg);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    return gradient;
  }

  renderSalesChart(data: any[]): void {
    if (this.salesChart) this.salesChart.destroy();
    const ctx = this.salesChartCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const gradient = this.createGradient(ctx, CHART_COLORS.indigo);
    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(item => item.month),
        datasets: [{
          label: 'Общая выручка, ₽',
          data: data.map(item => item.total),
          borderColor: CHART_COLORS.indigo.border,
          backgroundColor: gradient,
          tension: 0.4,
          fill: true,
          borderWidth: 2.5,
          pointBackgroundColor: '#fff',
          pointBorderColor: CHART_COLORS.indigo.border,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
        }]
      },
      options: this.getChartOptions()
    });
  }

  renderIngredientChart(data: any[], group: string): void {
    if (this.ingredientChart) this.ingredientChart.destroy();
    const ctx = this.ingredientChartCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const gradient = this.createGradient(ctx, CHART_COLORS.pink);
    this.ingredientChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(item => item.month),
        datasets: [{
          label: `Выручка (ингредиент: ${group})`,
          data: data.map(item => item.total),
          borderColor: CHART_COLORS.pink.border,
          backgroundColor: gradient,
          tension: 0.4,
          fill: true,
          borderWidth: 2.5,
          pointBackgroundColor: '#fff',
          pointBorderColor: CHART_COLORS.pink.border,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
        }]
      },
      options: this.getChartOptions()
    });
  }

  renderOccasionChart(data: any[], occasionName: string): void {
    if (this.occasionChart) this.occasionChart.destroy();
    const ctx = this.occasionChartCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const gradient = this.createGradient(ctx, CHART_COLORS.cyan);
    this.occasionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(item => item.month),
        datasets: [{
          label: `Выручка (${occasionName})`,
          data: data.map(item => item.total),
          borderColor: CHART_COLORS.cyan.border,
          backgroundColor: gradient,
          tension: 0.4,
          fill: true,
          borderWidth: 2.5,
          pointBackgroundColor: '#fff',
          pointBorderColor: CHART_COLORS.cyan.border,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
        }]
      },
      options: this.getChartOptions()
    });
  }

  renderIngredientPieChart(data: any[]): void {
    if (this.ingredientPieChart) this.ingredientPieChart.destroy();
    const ctx = this.ingredientPieCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    this.ingredientPieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(item => item.ingredient_group),
        datasets: [{
          data: data.map(item => item.total),
          backgroundColor: PIE_COLORS.slice(0, data.length),
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.9)',
          hoverOffset: 8,
        }]
      },
      options: this.getPieOptions('По группам ингредиентов')
    });
  }

  renderOccasionPieChart(data: any[]): void {
    if (this.occasionPieChart) this.occasionPieChart.destroy();
    const ctx = this.occasionPieCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    this.occasionPieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(item => item.occasion_name),
        datasets: [{
          data: data.map(item => item.total),
          backgroundColor: PIE_COLORS.slice(0, data.length),
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.9)',
          hoverOffset: 8,
        }]
      },
      options: this.getPieOptions('По праздникам')
    });
  }

  renderPopularChart(data: any[]): void {
    if (this.popularChart) this.popularChart.destroy();
    const ctx = this.popularCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const colors = data.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);
    this.popularChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(item => item.name || item.product_name),
        datasets: [{
          label: 'Количество продаж',
          data: data.map(item => item.count || item.total_sold),
          backgroundColor: colors,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        }]
      },
      options: {
        ...this.getChartOptions('Популярные товары'),
        indexAxis: 'y' as const,
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.08)' },
            ticks: { font: { ...CHART_FONT, size: 12 }, color: '#94a3b8' },
            border: { display: false }
          },
          y: {
            grid: { display: false },
            ticks: { font: { ...CHART_FONT, size: 12 }, color: '#475569' },
            border: { display: false }
          }
        }
      }
    });
  }

  renderAverageCheckChart(): void {
    if (this.averageCheckChart) this.averageCheckChart.destroy();
    const ctx = this.averageCheckCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const labels = this.averageCheckData.map(item => item.month);
    const values = this.averageCheckData.map(item => item.avg_check);
    this.averageCheckChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Средний чек, ₽',
          data: values,
          borderColor: CHART_COLORS.emerald.border,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2.5,
          pointBackgroundColor: '#fff',
          pointBorderColor: CHART_COLORS.emerald.border,
          pointBorderWidth: 2,
          pointRadius: 4,
        }]
      },
      options: this.getChartOptions()
    });
  }

}