## 3.3 Реализация клиентской части (Frontend)

Клиентская часть системы автоматизации продаж кондитерских изделий разработана с использованием современного фреймворка Angular версии 16. Выбор данного технологического стека обусловлен рядом преимуществ: строгой типизацией TypeScript, модульной архитектурой, встроенными механизмами маршрутизации, реактивным программированием с помощью RxJS, а также мощной системой зависимостей и внедрения зависимостей (Dependency Injection). Для визуализации аналитических данных применена библиотека Chart.js версии 4.4.0, предоставляющая гибкие возможности для построения интерактивных графиков различных типов.

### 3.3.1 Архитектура и структура проекта

Проект организован в соответствии с рекомендациями Angular Style Guide и имеет следующую структуру директорий:

```
src/app/
├── admin/                    # Модуль администратора
│   ├── admin-layout/         # Layout-компонент админки
│   ├── dashboard/            # Компонент дашборда с аналитикой
│   ├── login/                # Компонент авторизации
│   ├── orders/               # Список заказов
│   ├── order-details/        # Детали заказа
│   ├── admin-routing.module.ts
│   └── admin.module.ts
├── cart/                     # Корзина покупок
├── home/                     # Главная страница с каталогом
├── guards/                   # Маршрутные.guard'ы
├── services/                 # Сервисы приложения
├── app-routing.module.ts     # Корневой маршрутизатор
├── app.component.ts          # Корневой компонент
└── app.module.ts             # Корневой модуль
```

Такая модульная структура обеспечивает разделение ответственности между функциональными областями: клиентская зона (каталог товаров, корзина, оформление заказа) и административная зона (дашборд, управление заказами, аналитика). Модуль администратора загружается лениво (lazy loading) при навигации по соответствующим маршрутам, что оптимизирует начальное время загрузки приложения.

Маршрутизация настроена следующим образом:

*Листинг 3.3.1 — Конфигурация маршрутизации (app-routing.module.ts)*

```typescript
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'cart', component: CartComponent },
  {
    path: 'admin',
    loadChildren: () => 
      import('./admin/admin.module').then(m => m.AdminModule)
  }
];
```

Данная конфигурация определяет три основных маршрута: корневой путь отображает главную страницу с каталогом товаров, маршрут `/cart` открывает компонент корзины, а все пути, начинающиеся с `/admin`, делегируются отдельному модулю администратора. Lazy loading модуля обеспечивает загрузку кода административной панели только при необходимости, что снижает размер начального бандла.

Для защиты административных маршрутов реализован guard `AuthGuard`, проверяющий наличие действительного токена авторизации в локальном хранилище:

*Листинг 3.3.2 — Guard авторизации (auth.guard.ts)*

```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('admin_token');
    if (token === 'admin-simple-token-123') {
      return true;
    } else {
      this.router.navigate(['/admin/login']);
      return false;
    }
  }
}
```

Механизм guard'а перехватывает попытку доступа к защищённым маршрутам и перенаправляет неавторизованного пользователя на страницу входа. В промышленной эксплуатации данная логика должна быть дополнена проверкой срока действия токена и возможностью его обновления.

### 3.3.2 Сервисный слой и взаимодействие с бэкендом

Взаимодействие с серверной частью организовано через сервис `ApiService`, инкапсулирующий все HTTP-запросы к REST API бэкенда. Сервис использует Angular HttpClient для отправки запросов и возвращает данные в виде Observable, что позволяет компонентам подписываться на поток данных и автоматически обновлять интерфейс при получении ответов.

*Листинг 3.3.3 — Сервис взаимодействия с API (api.service.ts, фрагмент)*

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = 'nikitina-elizaveta-cookies-backend-aa5c.twc1.net/api';
  
  constructor(private http: HttpClient) { }

  getProducts(params?: any): Observable<Product[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.occasions?.length) {
        httpParams = httpParams.set('occasions', params.occasions.join(','));
      }
      if (params.ingredientGroups?.length) {
        httpParams = httpParams.set('ingredient_groups', 
                                    params.ingredientGroups.join(','));
      }
      if (params.no_nuts) httpParams = httpParams.set('no_nuts', 'true');
      if (params.no_gluten) httpParams = httpParams.set('no_gluten', 'true');
      if (params.no_dairy) httpParams = httpParams.set('no_dairy', 'true');
      if (params.vegan) httpParams = httpParams.set('vegan', 'true');
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<Product[]>(`${this.apiUrl}/products`, 
                                     { params: httpParams });
  }

  getFilters(): Observable<FiltersData> {
    return this.http.get<FiltersData>(`${this.apiUrl}/filters`);
  }

  postFilterEvent(sessionId: string, filters: any, 
                  resultsCount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/analytics/filter`, {
      session_id: sessionId,
      filters: filters,
      results_count: resultsCount
    });
  }
}
```

Сервис предоставляет методы для всех основных операций: получение списка товаров с параметрами фильтрации, загрузка доступных фильтров, отправка событий использования фильтров для аналитики, создание заказов, получение статистики. Особое внимание уделено поддержке аналитических эндпоинтов: методы `getPopularProducts`, `getSalesByIngredientGroupOverTime`, `getSalesByOccasionOverTime`, `getAverageCheckByMonth` и другие обеспечивают данными дашборд администратора.

Для административных запросов, требующих аутентификации, используется специальный заголовок `X-Admin-Token`, значение которого извлекается из localStorage:

```typescript
private getAdminHeaders(): HttpHeaders {
  const token = localStorage.getItem('admin_token');
  return new HttpHeaders().set('X-Admin-Token', token || '');
}

getOrders(): Observable<any> {
  return this.http.get(`${this.apiUrl}/admin/orders`, 
                        { headers: this.getAdminHeaders() });
}
```

Такой подход централизует логику аутентификации и обеспечивает безопасность запросов к административным ресурсам.

Обработка ошибок реализована на уровне компонентов через механизм callback'ов `error` в подписках Observable. При возникновении ошибки пользователю отображается уведомление через сервис `ToastService`, обеспечивающий ненавязчивое информирование о событиях системы.

### 3.3.3 Управление состоянием корзины

Состояние корзины покупок управляется сервисом `CartService`, который использует localStorage браузера для постоянного хранения данных между сессиями. Такой выбор обусловлен тем, что корзина является персональными данными пользователя, и её сохранение должно происходить на стороне клиента без обязательной регистрации.

*Листинг 3.3.4 — Сервис корзины (cart.service.ts)*

```typescript
export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private cartKey = 'shopping-cart';

  getCart(): CartItem[] {
    const cart = localStorage.getItem(this.cartKey);
    return cart ? JSON.parse(cart) : [];
  }

  private saveCart(cart: CartItem[]): void {
    localStorage.setItem(this.cartKey, JSON.stringify(cart));
  }

  addToCart(item: CartItem): void {
    const cart = this.getCart();
    const existing = cart.find(i => i.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push(item);
    }
    this.saveCart(cart);
  }

  removeFromCart(productId: number): void {
    const cart = this.getCart().filter(i => i.productId !== productId);
    this.saveCart(cart);
  }

  updateQuantity(productId: number, quantity: number): void {
    const cart = this.getCart();
    const item = cart.find(i => i.productId === productId);
    if (item) {
      item.quantity = quantity;
      if (item.quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        this.saveCart(cart);
      }
    }
  }

  getTotalItems(): number {
    return this.getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  getTotalPrice(): number {
    return this.getCart().reduce((sum, item) => 
           sum + item.price * item.quantity, 0);
  }

  clearCart(): void {
    localStorage.removeItem(this.cartKey);
  }
}
```

Сервис предоставляет полный CRUD-интерфейс для управления корзиной: добавление товара (с автоматическим объединением количества при повторном добавлении), удаление, изменение количества, получение общей суммы и количества позиций. Метод `isInCart` позволяет компонентам определять, находится ли товар уже в корзине, для изменения поведения кнопки действия.

Использование localStorage вместо sessionStorage обосновано тем, что пользователи ожидают сохранения содержимого корзины при закрытии и повторном открытии браузера. Однако в реальной системе с личными кабинетами целесообразно реализовать синхронизацию корзины с сервером после авторизации.

### 3.3.4 Реализация системы фильтрации и поиска

Система фильтрации товаров представляет собой ключевой функциональный элемент клиентской части, обеспечивающий удобную навигацию по ассортименту кондитерских изделий. Фильтрация реализована на основе параметров, передаваемых на бэкенд через query-строку URL, что позволяет использовать серверную пагинацию и сортировку.

Компонент главной страницы `HomeComponent` управляет состоянием фильтров через следующие свойства:

*   `selectedOccasions: number[]` — массив идентификаторов выбранных праздников;
*   `selectedIngredientGroups: string[]` — массив названий выбранных групп ингредиентов;
*   `dietaryFilters: DietaryFilters` — объект с булевыми флагами диетических ограничений (без орехов, без глютена, без молочных продуктов, веганское);
*   `sortOrder: string` — текущий порядок сортировки (`price_asc`, `price_desc`).

*Листинг 3.3.5 — Логика фильтрации в HomeComponent (home.component.ts, фрагмент)*

```typescript
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

  ngOnInit(): void {
    this.loadFilters();
    this.loadProducts();
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
        // Отправка события аналитики
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
}
```

При изменении любого параметра фильтрации вызывается метод `loadProducts()`, который формирует объект параметров и отправляет GET-запрос к эндпоинту `/api/products`. Важной особенностью реализации является отправка события аналитики сразу после успешной загрузки товаров: метод `postFilterEvent` передаёт на сервер идентификатор сессии, применённые фильтры и количество найденных результатов. Это позволяет накапливать статистику использования фильтров для последующего анализа в административной панели.

Идентификатор сессии генерируется один раз при первом посещении сайта и сохраняется в localStorage:

```typescript
generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
           .replace(/[xy]/g, function(c) {
             const r = Math.random() * 16 | 0, 
                   v = c === 'x' ? r : (r & 0x3 | 0x8);
             return v.toString(16);
           });
}
```

Формат UUID v4 обеспечивает уникальность идентификатора в пределах разумной вероятности коллизий. Сохранение session_id между перезагрузками страницы позволяет отслеживать поведение пользователя в течение всей сессии.

Интерфейс фильтрации реализован с использованием HTML-элемента `<details>`, предоставляющего нативный аккордеон без необходимости подключения дополнительных библиотек. Каждый блок фильтров (Праздники, Ингредиенты, Диетические, Сортировка) раскрывается по клику на заголовок, что экономит пространство экрана и улучшает пользовательский опыт на мобильных устройствах.

### 3.3.5 Оформление заказа

Процесс оформления заказа реализован в двух сценариях: заказ из корзины и индивидуальный заказ напрямую с главной страницы. Оба сценария используют реактивные формы Angular для валидации введённых данных.

*Листинг 3.3.6 — Обработка заказа в корзине (cart.component.ts)*

```typescript
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];
  total: number = 0;

  checkoutForm = this.fb.group({
    name: ['', [Validators.required, 
                Validators.pattern('^[А-Яа-яЁё\\s-]+$')]],
    phone: ['', [Validators.required, 
                 Validators.pattern('^\\+?[0-9]{10,11}$')]]
  });

  submitOrder(): void {
    if (this.checkoutForm.valid && this.cartItems.length > 0) {
      const orderData = {
        customer_name: this.checkoutForm.value.name,
        customer_phone: this.checkoutForm.value.phone,
        comment: '',
        items: this.cartItems.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      };
      
      this.api.postOrder(orderData).subscribe({
        next: (res) => {
          this.toast.show('Заказ оформлен!');
          this.cartService.clearCart();
          this.loadCart();
          this.checkoutForm.reset();
        },
        error: (err) => {
          console.error(err);
          this.toast.show('Ошибка при оформлении заказа');
        }
      });
    }
  }
}
```

Форма валидирует имя клиента (только русские буквы, пробелы и дефисы) и телефон (10-11 цифр с опциональным плюсом). При успешной валидации формируется объект заказа, содержащий информацию о клиенте и массив позиций с идентификаторами товаров, количеством и ценой. После успешного ответа от сервера корзина очищается, форма сбрасывается, пользователю отображается уведомление.

Индивидуальный заказ с главной страницы работает аналогично, но позволяет отправить заявку без выбора конкретных товаров — например, для обсуждения особого дизайна печенья или крупного корпоративного заказа.

### 3.3.6 Система уведомлений

Для обратной связи с пользователем разработан сервис `ToastService`, отображающий всплывающие уведомления (toast messages) в правом верхнем углу экрана. Сервис динамически создаёт DOM-элементы, добавляет их в контейнер и автоматически удаляет через заданный промежуток времени с CSS-анимацией затухания.

*Листинг 3.3.7 — Сервис уведомлений (toast.service.ts)*

```typescript
@Injectable({ providedIn: 'root' })
export class ToastService {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message: string, duration: number = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (this.container.contains(toast)) {
          this.container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
}
```

Использование собственного сервиса вместо сторонних библиотек обусловлено желанием минимизировать количество зависимостей и сохранить полный контроль над стилизацией и поведением уведомлений. Длительность отображения по умолчанию составляет 3 секунды, что достаточно для прочтения сообщения, но не перегружает интерфейс.

### 3.3.7 Реализация системы аналитики и дашбордов

Центральным элементом системы аналитики является дашборд администратора, реализованный в компоненте `DashboardComponent`. Дашборд предоставляет визуальное представление ключевых метрик бизнеса: динамики продаж, популярности товаров, эффективности маркетинговых активностей, связанных с праздниками, и паттернов использования фильтров.

#### 3.3.7.1 Архитектура дашборда

Компонент дашборда использует библиотеку Chart.js для рендеринга интерактивных графиков. Для интеграции с Angular зарегистрированы модули Chart.js через `registerables`:

```typescript
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
```

Дашборд состоит из нескольких секций:

1.  **Общий график продаж по месяцам** — линейный график с площадью, показывающий выручку в динамике.
2.  **График продаж по выбранной группе ингредиентов** — позволяет анализировать вклад конкретного ингредиента (шоколад, ягоды, орехи и т.д.) в общую выручку.
3.  **График продаж по выбранному празднику** — отображает сезонность спроса, связанную с конкретным событием (Новый год, День святого Валентина, 8 Марта).
4.  **Круговые диаграммы** — распределение продаж по группам ингредиентов и праздникам за последний месяц.
5.  **График среднего чека** — динамика средней суммы заказа во времени.
6.  **Таблица популярных товаров** — топ-5 товаров по количеству продаж.
7.  **Таблица топ-10 фильтров** — наиболее часто используемые комбинации фильтров.

Каждый график или таблица имеют независимый селектор периода, позволяющий анализировать данные за разные промежутки времени: всё время, последний год, 6 месяцев, 3 месяца, последний месяц.

#### 3.3.7.2 Управление периодами данных

Для каждого визуального элемента дашборда реализованы отдельные свойства состояния, хранящие выбранный период и вычисленные даты начала и окончания:

*Листинг 3.3.8 — Свойства периодов в DashboardComponent (dashboard.component.ts, фрагмент)*

```typescript
export class DashboardComponent implements OnInit, AfterViewInit {
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
  
  // ... остальные периоды
}
```

Такая архитектура позволяет пользователю независимо выбирать периоды для разных метрик, сравнивая, например, продажи за последний квартал с годовыми показателями популярности товаров.

Методы `updateDateRange...` вычисляют даты начала и окончания на основе выбранного периода:

*Листинг 3.3.9 — Вычисление дат периода (dashboard.component.ts)*

```typescript
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
```

При выборе значения `'all_time'` даты не передаются на бэкенд, что интерпретируется сервером как запрос всех доступных данных. Для остальных вариантов вычисляется относительная дата от текущего момента в формате ISO 8601 (YYYY-MM-DD).

#### 3.3.7.3 Загрузка и визуализация данных

Загрузка данных происходит в методе `ngOnInit()` через серию вызовов методов API:

*Листинг 3.3.10 — Инициализация дашборда (dashboard.component.ts)*

```typescript
ngOnInit(): void {
  this.loadFiltersData();
  this.loadSalesData();
  this.loadIngredientPieData();
  this.loadOccasionPieData();
  this.loadPopularProducts();
  this.loadUnpopularProducts();
  this.loadFilterStats();
  this.loadAverageCheck();
  this.loadIngredientSalesData(this.selectedIngredientGroup);
  this.loadOccasionSalesData(this.selectedOccasionId);
}
```

Каждый метод загружает данные для конкретного виджета и вызывает соответствующий метод отрисовки графика. Например, загрузка общих продаж:

```typescript
loadSalesData(): void {
  this.api.getSalesByMonth(this.startDateSales, this.endDateSales)
    .subscribe({
      next: (data) => {
        this.calculateStats(data);
        this.renderSalesChart(data);
      },
      error: (err) => console.error('Ошибка загрузки продаж:', err)
    });
}
```

Метод `calculateStats` вычисляет агрегированные показатели для карточек статистики (общая выручка, темп роста, количество клиентов):

```typescript
calculateStats(salesData: any[]): void {
  if (!salesData || !salesData.length) return;
  
  this.totalRevenue = salesData.reduce((sum, item) => 
                          sum + (item.total || 0), 0);
  
  if (salesData.length >= 2) {
    const lastMonth = salesData[salesData.length - 1].total || 0;
    const prevMonth = salesData[salesData.length - 2].total || 0;
    this.growthRate = prevMonth > 0 
      ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) 
      : 0;
  }
  
  this.totalCustomers = salesData.reduce((sum, item) => 
                           sum + (item.customers || 0), 0);
  this.ordersToday = salesData.length > 0 
    ? (salesData[salesData.length - 1].orders || 0) 
    : 0;
}
```

Темп роста рассчитывается как процентное изменение выручки последнего месяца относительно предыдущего. Положительное значение указывает на рост бизнеса, отрицательное — на спад.

#### 3.3.7.4 Рендеринг графиков

Отрисовка графиков выполнена с использованием единого подхода: создание экземпляра Chart.js, привязанного к HTMLCanvasElement, с предварительным уничтожением предыдущего экземпляра для предотвращения утечек памяти.

*Листинг 3.3.11 — Рендеринг графика продаж (dashboard.component.ts)*

```typescript
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
```

Для улучшения визуального восприятия используется градиентная заливка под линией графика, создаваемая методом `createGradient`:

```typescript
private createGradient(ctx: CanvasRenderingContext2D, 
                       color: { border: string; bg: string }): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, color.bg);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  return gradient;
}
```

Градиент переходит от полупрозрачного цвета к полностью прозрачному, создавая эффект глубины.

Настройки графиков вынесены в отдельные методы `getChartOptions()` и `getPieOptions()` для обеспечения консистентности стиля:

```typescript
private getChartOptions(titleText?: string): any {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { 
        labels: { 
          font: { family: "'Inter', sans-serif", size: 13 }, 
          color: '#64748b' 
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
        bodyFont: { family: "'Inter', sans-serif", size: 13 },
        titleFont: { family: "'Inter', sans-serif", size: 14, weight: '600' },
      },
      ...(titleText ? {
        title: {
          display: true,
          text: titleText,
          font: { family: "'Inter', sans-serif", size: 15, weight: '600' },
          color: '#1e293b',
          padding: { bottom: 16 }
        }
      } : {}),
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        ticks: { font: { family: "'Inter', sans-serif", size: 12 }, 
                 color: '#94a3b8' },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Inter', sans-serif", size: 12 }, 
                 color: '#94a3b8' },
        border: { display: false }
      }
    }
  };
}
```

Конфигурация включает:

*   Адаптивность (`responsive: true`) для корректного отображения на разных размерах экрана.
*   Единый шрифт Inter для всех текстовых элементов.
*   Кастомизированные tooltips с белым фоном, скруглёнными углами и цветовой схемой, соответствующей дизайну системы.
*   Минималистичную сетку с лёгкими линиями для улучшения читаемости без визуального шума.
*   Ось Y, начинающуюся с нуля, для объективного отображения масштаба изменений.

Для круговых диаграмм используется тип `'doughnut'` с вырезанной серединой (cutout: '55%'), что соответствует современному тренду в дизайне инфографики:

```typescript
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
```

Цветовая палитра `PIE_COLORS` определена заранее и содержит 8 гармоничных оттенков для различения категорий:

```typescript
const PIE_COLORS = [
  'rgba(99, 102, 241, 0.8)',   // indigo
  'rgba(6, 182, 212, 0.8)',    // cyan
  'rgba(236, 72, 153, 0.8)',   // pink
  'rgba(245, 158, 11, 0.8)',   // amber
  'rgba(16, 185, 129, 0.8)',   // emerald
  'rgba(139, 92, 246, 0.8)',   // violet
  'rgba(244, 114, 182, 0.8)',  // rose
  'rgba(34, 211, 238, 0.8)',   // sky
];
```

#### 3.3.7.5 Интерактивность и обработка событий

Все селекторы периодов и фильтров связаны с обработчиками событий, которые обновляют состояние компонента и инициируют повторную загрузку данных:

*Листинг 3.3.12 — Обработчики изменений периода (dashboard.component.ts)*

```typescript
onPeriodChangeSales(event: Event): void {
  const select = event.target as HTMLSelectElement;
  this.selectedPeriodSales = select.value;
  this.updateDateRangeSales();
  this.loadSalesData();
}

onIngredientGroupChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  this.selectedIngredientGroup = select.value;
  this.loadIngredientSalesData(this.selectedIngredientGroup);
}
```

Такой подход обеспечивает мгновенную реакцию интерфейса на действия пользователя: при выборе нового периода даты пересчитываются, данные загружаются заново, график перерисовывается с новыми значениями.

Особое внимание уделено обработке случаев, когда выбранный ингредиент или праздник ещё не установлен:

```typescript
loadIngredientSalesData(group: string): void {
  if (!group) return;
  this.api.getSalesByIngredientGroupOverTime(
    group, 
    this.startDateIngredientLine, 
    this.endDateIngredientLine
  ).subscribe({
    next: (data) => {
      this.renderIngredientChart(data, group);
    },
    error: (err) => console.error(err)
  });
}
```

Проверка `if (!group) return` предотвращает отправку некорректных запросов к API.

#### 3.3.7.6 Анализ статистики фильтров

Одной из ключевых особенностей системы является возможность анализа того, как пользователи фильтруют товары. Эта информация помогает понять предпочтения клиентов и оптимизировать ассортимент.

Данные о использовании фильтров загружаются методом `loadFilterStats()`:

```typescript
loadFilterStats(): void {
  this.api.getFilterStats().subscribe({
    next: (data: any) => {
      this.topFilters = data.top || [];
    },
    error: (err) => console.error(err)
  });
}
```

Бэкенд агрегирует события, отправленные методом `postFilterEvent` из `HomeComponent`, и возвращает топ наиболее популярных комбинаций фильтров. Таблица в дашборде отображает эти данные в формате «Фильтр — Количество применений», что позволяет администратору быстро выявить закономерности: например, если часто выбирают фильтр «без глютена», это может сигнализировать о спросе на безглютеновую продукцию и необходимости расширения соответствующей линейки товаров.

### 3.3.8 Обоснование архитектурных решений

Выбор архитектуры клиентского приложения обусловлен следующими соображениями:

**1. Модульность и разделение ответственности.** Разделение на клиентский и административный модули позволяет независимо развивать функциональность для разных ролей пользователей. Lazy loading админ-модуля сокращает время первоначальной загрузки для обычных посетителей сайта.

**2. Сервис-ориентированный подход.** Все операции с данными инкапсулированы в сервисах (`ApiService`, `CartService`, `AuthService`, `ToastService`), что обеспечивает:
*   Централизованное управление состоянием;
*   Возможность повторного использования логики в разных компонентах;
*   Упрощение тестирования благодаря возможности мокирования сервисов;
*   Чёткое разделение между бизнес-логикой и представлением.

**3. Reactive programming с RxJS.** Использование Observable для асинхронных операций позволяет:
*   Обрабатывать потоки данных декларативно;
*   Легко комбинировать несколько запросов с помощью операторов (mergeMap, switchMap, forkJoin);
*   Реализовывать отмену запросов при изменении параметров;
*   Обрабатывать ошибки в едином месте подписки.

**4. Локальное хранение состояния корзины.** Выбор localStorage вместо sessionStorage или серверного хранения для корзины обоснован тем, что:
*   Пользователи ожидают сохранения корзины между сессиями браузера;
*   Не требуется регистрация для совершения покупки, что снижает барьер конверсии;
*   Уменьшается нагрузка на сервер, так как данные хранятся на клиенте.

В будущей версии целесообразно добавить синхронизацию корзины с сервером после авторизации пользователя.

**5. Server-side filtering.** Фильтрация товаров выполняется на стороне сервера, а не клиента, по следующим причинам:
*   При большом ассортименте (сотни товаров) клиентская фильтрация стала бы неэффективной;
*   Серверная фильтрация позволяет использовать индексы базы данных для ускорения поиска;
*   Снижается объём передаваемых данных: клиент получает только отфильтрованные товары;
*   Возможность вести аналитику запросов фильтров на сервере.

**6. Chart.js для визуализации.** Выбор Chart.js вместо альтернатив (D3.js, Highcharts, ApexCharts) обусловлен:
*   Бесплатной лицензией MIT;
*   Хорошей документацией и большим сообществом;
*   Поддержкой адаптивности и touch-событий для мобильных устройств;
*   Достаточным набором типов графиков для задач бизнес-аналитики;
*   Простой интеграцией с Angular через ng2-charts или прямое использование API.

**7. Ванильные HTML <details> для аккордеона.** Использование нативного элемента вместо JavaScript-библиотек для аккордеона фильтров даёт преимущества:
*   Отсутствие дополнительных зависимостей;
*   Встроенная поддержка клавиатуры и скринридеров (accessibility);
*   Работоспособность даже при отключённом JavaScript;
*   Меньший размер бандла и быстрее загрузка.

**8. UUID для идентификации сессий.** Генерация UUID v4 на клиенте и сохранение в localStorage позволяет:
*   Отслеживать поведение пользователя в течение сессии без регистрации;
*   Собирать анонимизированную аналитику использования фильтров;
*   Избежать сложности с управлением сессиями на сервере для неавторизованных пользователей.

### 3.3.9 Выводы по разделу

В данном разделе была подробно рассмотрена реализация клиентской части системы автоматизации продаж кондитерских изделий. Приложение разработано на фреймворке Angular 16 с использованием TypeScript для строгой типизации и повышения надёжности кода.

Ключевые достижения реализации:

1.  **Модульная архитектура** с чётким разделением клиентской и административной зон, обеспечивающая масштабируемость и поддерживаемость кода.
2.  **Сервис-ориентированный дизайн**, инкапсулирующий логику работы с данными, состоянием корзины, аутентификацией и уведомлениями.
3.  **Гибкая система фильтрации** с серверной обработкой параметров и встроенной аналитикой использования фильтров.
4.  **Интеграция с REST API** бэкенда на FastAPI через HttpClient с поддержкой аутентификации и обработки ошибок.
5.  **Интерактивный дашборд аналитики** с визуализацией ключевых метрик бизнеса: динамики продаж, популярности товаров и ингредиентов, сезонности спроса, паттернов фильтрации.
6.  **Адаптивная визуализация данных** на базе Chart.js с единой стилистикой, градиентами, кастомными tooltips и поддержкой различных периодов анализа.
7.  **Удобный процесс оформления заказа** с валидацией форм, очисткой корзины и обратной связью через систему уведомлений.

Реализованная клиентская часть полностью удовлетворяет требованиям диплома: обеспечивает автоматизацию продаж через удобный каталог с фильтрацией и корзину, а также предоставляет руководству магазина мощный инструмент аналитики для принятия обоснованных бизнес-решений на основе данных о продажах, предпочтениях клиентов и эффективности маркетинговых активностей.

Дальнейшее развитие системы может включать:
*   Добавление личного кабинета пользователя с историей заказов;
*   Реализацию push-уведомлений о статусе заказа;
*   Интеграцию с платёжными системами для онлайн-оплаты;
*   Расширение дашборда прогнозами продаж на основе машинного обучения;
*   A/B-тестирование различных вариантов отображения товаров и фильтров.
