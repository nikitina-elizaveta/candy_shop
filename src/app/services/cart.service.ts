import { Injectable } from '@angular/core';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartKey = 'shopping-cart';

  constructor() { }

  // Получить корзину из localStorage
  getCart(): CartItem[] {
    const cart = localStorage.getItem(this.cartKey);
    return cart ? JSON.parse(cart) : [];
  }

  // Сохранить корзину
  private saveCart(cart: CartItem[]): void {
    localStorage.setItem(this.cartKey, JSON.stringify(cart));
  }

  // Добавить товар (если уже есть, увеличить количество)
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

  // Удалить товар
  removeFromCart(productId: number): void {
    const cart = this.getCart().filter(i => i.productId !== productId);
    this.saveCart(cart);
  }

  // Изменить количество
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

  isInCart(productId: number): boolean {
  return this.getCart().some(item => item.productId === productId);
}

  // Получить общее количество товаров
  getTotalItems(): number {
    return this.getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  // Получить общую сумму
  getTotalPrice(): number {
    return this.getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // Очистить корзину
  clearCart(): void {
    localStorage.removeItem(this.cartKey);
  }
}