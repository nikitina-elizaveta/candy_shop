import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.css']
})
export class OrderDetailsComponent implements OnInit {
  order: any = null;
  items: any[] = []; 
  total: number = 0;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.api.getOrderDetails(id).subscribe({
  next: (data) => {
    console.log('Детали заказа:', data);
    this.order = data.order;
    this.items = data.items || [];
    this.total = this.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  },
  error: (err) => console.error(err)
});
  }}