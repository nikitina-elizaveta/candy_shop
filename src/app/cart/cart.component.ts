import { Component, OnInit } from '@angular/core';
import { CartService, CartItem } from '../services/cart.service';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];
  total: number = 0;

  checkoutForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern('^[А-Яа-яЁё\\s-]+$')]],
    phone: ['', [Validators.required, Validators.pattern('^\\+?[0-9]{10,11}$')]]
  });

  constructor(
    private cartService: CartService,
    private fb: FormBuilder,
    private api: ApiService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.loadCart();
    window.scrollTo(0, 0);

  }

  loadCart(): void {
    this.cartItems = this.cartService.getCart();
    this.total = this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  updateQuantity(productId: number, quantity: number): void {
    this.cartService.updateQuantity(productId, quantity);
    this.loadCart();
  }

  removeFromCart(productId: number): void {
    this.cartService.removeFromCart(productId);
    this.loadCart();
  }

  clearCart(): void {
    this.cartService.clearCart();
    this.loadCart();
  }

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