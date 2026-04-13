import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService, Product, FiltersData } from './services/api.service';

// Определяем интерфейс для диетических фильтров
interface DietaryFilters {
  no_nuts: boolean;
  no_gluten: boolean;
  no_dairy: boolean;
  vegan: boolean;
  [key: string]: boolean; // разрешает доступ по строковому ключу
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isAdminLoggedIn = false;
  sessionId: string;

  products: Product[] = [];
  filtersData: FiltersData | null = null;

  selectedOccasions: number[] = [];
  selectedIngredientGroups: string[] = [];

  dietaryFilters: DietaryFilters = {
    no_nuts: false,
    no_gluten: false,
    no_dairy: false,
    vegan: false
  };

  sortOrder: string = '';

  form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    comment: ['']
  });

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private api: ApiService
  ) {
    this.sessionId = localStorage.getItem('session_id') || this.generateSessionId();
    localStorage.setItem('session_id', this.sessionId);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkAdminAuth();
      }
    });
  }

  ngOnInit(): void {
    this.loadFilters();
    this.loadProducts();
  }

  generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  loadFilters(): void {
    this.api.getFilters().subscribe({
      next: (data) => {
        this.filtersData = data;
      },
      error: (err) => console.error('Ошибка загрузки фильтров', err)
    });
  }

  loadProducts(): void {
    const params: any = {};
    if (this.selectedOccasions.length > 0) {
      params.occasions = this.selectedOccasions;
    }
    if (this.selectedIngredientGroups.length > 0) {
      params.ingredientGroups = this.selectedIngredientGroups;
    }
    if (this.dietaryFilters.no_nuts) params.no_nuts = true;
    if (this.dietaryFilters.no_gluten) params.no_gluten = true;
    if (this.dietaryFilters.no_dairy) params.no_dairy = true;
    if (this.dietaryFilters.vegan) params.vegan = true;
    if (this.sortOrder) params.sort = this.sortOrder;

    this.api.getProducts(params).subscribe({
      next: (products) => {
        this.products = products;
        // Отправляем событие в аналитику
        this.api.postFilterEvent(this.sessionId, {
          occasions: this.selectedOccasions,
          ingredientGroups: this.selectedIngredientGroups,
          dietary: this.dietaryFilters,
          sort: this.sortOrder
        }, products.length).subscribe();
      },
      error: (err) => console.error('Ошибка загрузки товаров', err)
    });
  }

  toggleOccasion(id: number): void {
    const index = this.selectedOccasions.indexOf(id);
    if (index === -1) {
      this.selectedOccasions.push(id);
    } else {
      this.selectedOccasions.splice(index, 1);
    }
    this.loadProducts();
  }

  toggleIngredientGroup(group: string): void {
    const index = this.selectedIngredientGroups.indexOf(group);
    if (index === -1) {
      this.selectedIngredientGroups.push(group);
    } else {
      this.selectedIngredientGroups.splice(index, 1);
    }
    this.loadProducts();
  }

  toggleDietary(key: string): void {
    this.dietaryFilters[key] = !this.dietaryFilters[key];
    this.loadProducts();
  }

  setSort(order: string): void {
    this.sortOrder = order;
    this.loadProducts();
  }

  scrollTo(target: HTMLElement) {
    target.scrollIntoView({behavior: 'smooth'});
  }

  selectProduct(title: string) {
    const orderSection = document.querySelector('#order');
    if (orderSection) {
      this.scrollTo(orderSection as HTMLElement);
    }
  }

  sendIndividualRequest(): void {
    if (this.form.valid) {
      const requestData = {
        customer_name: this.form.value.name,
        customer_phone: this.form.value.phone,
        comment: this.form.value.comment,
        items: [] // пустая корзина
      };
      this.api.postOrder(requestData).subscribe({
        next: (res) => {
          alert('Заявка отправлена!');
          this.form.reset();
        },
        error: (err) => {
          console.error(err);
          alert('Ошибка при отправке заявки');
        }
      });
    }
  }

  checkAdminAuth(): void {
    const token = localStorage.getItem('admin_token');
    this.isAdminLoggedIn = token === 'admin-simple-token-123';
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    this.isAdminLoggedIn = false;
    this.router.navigate(['/']);
  }
}