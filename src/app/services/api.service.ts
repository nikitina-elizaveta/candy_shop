import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  id_product: number;
  name: string;
  price: number;
  image: string;
  description: string;
  weight: string;
}

export interface FilterOption {
  id: number;
  name: string;
}

export interface FiltersData {
  occasions: FilterOption[];
  ingredientGroups: string[];
  dietaryFilters: { id: string; name: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
private apiUrl = 'https://nikitina-elizaveta-cookies-backend-4030.twc1.net/api';
constructor(private http: HttpClient) { }

  getProducts(params?: any): Observable<Product[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.occasions?.length) {
        httpParams = httpParams.set('occasions', params.occasions.join(','));
      }
      if (params.ingredientGroups?.length) {
        httpParams = httpParams.set('ingredient_groups', params.ingredientGroups.join(','));
      }
      if (params.no_nuts) httpParams = httpParams.set('no_nuts', 'true');
      if (params.no_gluten) httpParams = httpParams.set('no_gluten', 'true');
      if (params.no_dairy) httpParams = httpParams.set('no_dairy', 'true');
      if (params.vegan) httpParams = httpParams.set('vegan', 'true');
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<Product[]>(`${this.apiUrl}/products`, { params: httpParams });
  }

  getFilters(): Observable<FiltersData> {
    return this.http.get<FiltersData>(`${this.apiUrl}/filters`);
  }

  postFilterEvent(sessionId: string, filters: any, resultsCount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/analytics/filter`, {
      session_id: sessionId,
      filters: filters,
      results_count: resultsCount
    });
  }

  postOrder(orderData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders`, orderData);
  }

  private getAdminHeaders(): HttpHeaders {
    console.log('Token from localStorage:', localStorage.getItem('admin_token'));
    const token = localStorage.getItem('admin_token');
    console.log('Token from localStorage:', token);
    return new HttpHeaders().set('X-Admin-Token', token || '');
  }

  getOrders(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/orders`, { headers: this.getAdminHeaders() });
  }

  getOrderDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/orders/${id}`, { headers: this.getAdminHeaders() });
  }

  // Обновлённый метод: популярные товары с опциональным периодом
  getPopularProducts(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/popular-products`, { headers: this.getAdminHeaders(), params });
  }

  // Продажи по ингредиентам за период (линейный график)
  getSalesByIngredientGroup(group: string, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams().set('group', group);
    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-ingredient-group-over-time`, { headers: this.getAdminHeaders(), params });
  }

  // Продажи по праздникам за период (линейный график)
  getSalesByOccasion(occasionId: number, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams().set('occasion_id', occasionId.toString());
    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-occasion-over-time`, { headers: this.getAdminHeaders(), params });
  }

  // Непопулярные товары за период
  getUnpopularProducts(limit: number = 5, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams().set('limit', limit.toString());
    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/unpopular-products`, { headers: this.getAdminHeaders(), params });
  }

  // Статистика фильтров за период
  getFilterStats(startDate?: string, endDate?: string): Observable<{ top: any[], bottom: any[] }> {
    let params = new HttpParams();
    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }
    return this.http.get<{ top: any[], bottom: any[] }>(`${this.apiUrl}/admin/analytics/filter-stats`, { headers: this.getAdminHeaders(), params });
  }

  // Продажи по месяцам (общий график)
  getSalesByMonth(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-month`, { headers: this.getAdminHeaders(), params });
  }

  // Круговые диаграммы (последний месяц) – оставляем
  getSalesByIngredientGroupLastMonth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-ingredient-group-last-month`, { headers: this.getAdminHeaders() });
  }

  getSalesByOccasionLastMonth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-occasion-last-month`, { headers: this.getAdminHeaders() });
  }

  // Линейные графики трендов ингредиентов и праздников (с датами)
  getSalesByIngredientGroupOverTime(group?: string, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (group) params = params.set('group', group);
    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-ingredient-group-over-time`, { headers: this.getAdminHeaders(), params });
  }

  getSalesByOccasionOverTime(occasionId?: number, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (occasionId) params = params.set('occasion_id', occasionId.toString());
    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-occasion-over-time`, { headers: this.getAdminHeaders(), params });
  }

  getAverageCheckByMonth(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/average-check-by-month`, { headers: this.getAdminHeaders(), params });
  }

  getPopularProductsByMonth(year?: number, month?: number): Observable<any> {
    let params = new HttpParams();
    if (year !== undefined && month !== undefined) {
      params = params.set('year', year.toString()).set('month', month.toString());
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/popular-products-by-month`, { headers: this.getAdminHeaders(), params });
  }

  // Остальные методы (если нужны)...
  getSalesByIngredientGroupPie(year?: number, month?: number): Observable<any> {
    let params = new HttpParams();
    if (year !== undefined && month !== undefined) {
      params = params.set('year', year.toString()).set('month', month.toString());
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-ingredient-group-pie`, { headers: this.getAdminHeaders(), params });
  }

  getSalesByOccasionPie(year?: number, month?: number): Observable<any> {
    let params = new HttpParams();
    if (year !== undefined && month !== undefined) {
      params = params.set('year', year.toString()).set('month', month.toString());
    }
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-occasion-pie`, { headers: this.getAdminHeaders(), params });
  }

  getSalesByDietary(dietary: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/analytics/sales-by-dietary?dietary=${dietary}`, { headers: this.getAdminHeaders() });
  }

  getPopularIngredientLastMonth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/analytics/popular-ingredient-month`, { headers: this.getAdminHeaders() });
  }
}
