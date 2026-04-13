import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService, Product, FiltersData } from '../services/api.service';
import { CartService } from '../services/cart.service';
import { Router } from '@angular/router';          // ✅ добавлен импорт
import { ToastService } from '../services/toast.service';

interface DietaryFilters {
  no_nuts: boolean;
  no_gluten: boolean;
  no_dairy: boolean;
  vegan: boolean;
  [key: string]: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
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
  sessionId: string;

  form = this.fb.group({
    name: ['', [
      Validators.required,
      Validators.pattern(/^[А-Яа-яЁё\s\-]+$/)
    ]],
    phone: ['', [
      Validators.required,
      Validators.pattern(/^\+?[0-9]{10,11}$/)
    ]],
    comment: ['']
  });

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private cartService: CartService,
    private router: Router,              // ✅ добавлен роутер
    private toast: ToastService
  ) {
    this.sessionId = localStorage.getItem('session_id') || this.generateSessionId();
    localStorage.setItem('session_id', this.sessionId);
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
    target.scrollIntoView({ behavior: 'smooth' });
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
        items: []
      };
      this.api.postOrder(requestData).subscribe({
        next: (res) => {
          this.toast.show('Заявка отправлена!');      
          this.form.reset();
        },
        error: (err) => {
          console.error(err);
          this.toast.show('Ошибка при отправке заявки'); // 
        }
      });
    }
  }

  isInCart(productId: number): boolean {
    return this.cartService.isInCart(productId);
  }

  handleCartAction(product: any): void {
    if (this.cartService.isInCart(product.id_product)) {
      this.router.navigate(['/cart']);
    } else {
      const item = {
        productId: product.id_product,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image
      };
      this.cartService.addToCart(item);
      this.toast.show('Товар добавлен в корзину');
    }
  }
}