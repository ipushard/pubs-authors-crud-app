import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  email = '';
  password = '';

  errorMessage = '';
  isLoading = false;
  submitted = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  login(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';

    if (form.invalid) {
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;

    this.authService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response) => {
        this.authService.saveLogin(response);

        this.isLoading = false;

        this.router.navigate(['/authors']);
      },

      error: (err) => {
        console.error('Login error:', err);

        this.isLoading = false;

        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to backend API. Make sure the Node server is running.';
        } else {
          this.errorMessage = err.error?.message || 'Login failed. Please check your email and password.';
        }

        this.cdr.detectChanges();
      }
    });
  }
}