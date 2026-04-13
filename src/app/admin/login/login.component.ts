import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm = this.fb.group({
    token: ['', Validators.required]
  });
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {}

  onSubmit(): void {
    const token = this.loginForm.value.token;
    if (token === 'admin-simple-token-123') {
      localStorage.setItem('admin_token', token);
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.toast.show('Неверный ключ');
    }
  }
}