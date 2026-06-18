import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  InviteInfo,
  CompleteInviteRequest,
  CompleteInviteResponse
} from '../models/register-invite';


import { LoginRequest, LoginResponse, LoggedInUser } from '../models/auth';

@Injectable({

  providedIn: 'root'
})

export class AuthService {


  private apiUrl = 'http://localhost:3000/api/auth';


  private tokenKey = 'assignment_work_token';
  private userKey = 'assignment_work_user';

  constructor(private http: HttpClient) {}



  login(loginData: LoginRequest): Observable<LoginResponse> {

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, loginData);

  }


  saveLogin(response: LoginResponse): void {
    localStorage.setItem(this.tokenKey, response.token);

    localStorage.setItem(this.userKey, JSON.stringify(response.user));
  }

  getToken(): string | null {

    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): LoggedInUser | null {
    const userJson = localStorage.getItem(this.userKey);

    if (!userJson) {
      return null;
    }

    return JSON.parse(userJson) as LoggedInUser;
  }



  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }


    isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.is_admin === true || Number(user?.is_admin) === 1;
  }

  
  getUserRole(): string {
    const user = this.getCurrentUser();
    return user?.job_desc ?? '';
  }


 //ROLES
  isManagement(): boolean {
  const role = this.getUserRole();

  const managementRoles = [
    'System Administrator',
    'Chief Executive Officer',
    'Business Operations Manager',
    'Chief Financial Officer',
    'Publisher',
    'Managing Editor',
    'Marketing Manager',
    'Public Relations Manager',
    'Acquisitions Manager',
    'Productions Manager',
    'Operations Manager'
  ];

  return this.isAdmin() || managementRoles.includes(role);
}

canViewSales(): boolean {
  const role = this.getUserRole();

  const salesAllowedRoles = [
    'System Administrator',
    'Chief Financial Officer',
    'Sales Representative',
    'Business Operations Manager',
    'Marketing Manager'
  ];

  return this.isAdmin() || salesAllowedRoles.includes(role);
}




getInviteInfo(token: string): Observable<InviteInfo> {
  return this.http.get<InviteInfo>(`${this.apiUrl}/invite/${token}`);
}

completeInvite(data: CompleteInviteRequest): Observable<CompleteInviteResponse> {
  return this.http.post<CompleteInviteResponse>(`${this.apiUrl}/complete-invite`, data);
}


}