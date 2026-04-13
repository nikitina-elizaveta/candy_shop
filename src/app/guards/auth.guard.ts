import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
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