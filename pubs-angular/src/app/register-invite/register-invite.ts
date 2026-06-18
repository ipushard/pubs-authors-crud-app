import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';

import { DatePipe, TitleCasePipe } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../services/auth';
import { InviteInfo } from '../models/register-invite';

@Component({
  selector: 'app-register-invite',
  imports: [
    FormsModule,
    DatePipe,
    TitleCasePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './register-invite.html',
  styleUrl: './register-invite.css'
})
export class RegisterInvite implements OnInit {

  token = '';

  inviteInfo: InviteInfo | null = null;

  password = '';
  confirmPassword = '';

  errorMessage = '';
  successMessage = '';

  isLoading = false;
  isSaving = false;
  submitted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.errorMessage = 'Invitation token is missing.';
      this.cdr.detectChanges();
      return;
    }

    this.loadInviteInfo();
  }

  loadInviteInfo(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getInviteInfo(this.token).subscribe({
      next: (data) => {
        this.inviteInfo = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading invite:', err);

        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Could not load invitation.';
        this.cdr.detectChanges();
      }
    });
  }

  completeRegistration(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (form.invalid) {
      this.cdr.detectChanges();
      return;
    }

    const validationError = this.validatePassword();

    if (validationError) {
      this.errorMessage = validationError;
      this.cdr.detectChanges();
      return;
    }

    this.isSaving = true;

    this.authService.completeInvite({
      token: this.token,
      password: this.password,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.successMessage = response.message;

        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1800);
      },
      error: (err) => {
        console.error('Error completing invite:', err);

        this.isSaving = false;
        this.errorMessage = err.error?.message || 'Could not complete registration.';
        this.cdr.detectChanges();
      }
    });
  }

  private validatePassword(): string {
    if (!this.password.trim()) {
      return 'Password is required.';
    }

    if (this.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    if (this.password !== this.confirmPassword) {
      return 'Passwords do not match.';
    }

    return '';
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}