import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AdminEmployee,
  EmployeeDeleteResponse,
  EmployeeInviteRequest,
  EmployeeInviteResponse,
  EmployeeUpdateRequest,
  EmployeeUpdateResponse,
  Job,
  Publisher
} from '../models/admin-employee';

@Injectable({
  providedIn: 'root'
})
export class AdminEmployeeService {

  private apiUrl = 'http://localhost:3000/api/admin';

  constructor(private http: HttpClient) {}

  getEmployees(): Observable<AdminEmployee[]> {
    return this.http.get<AdminEmployee[]>(`${this.apiUrl}/employees`);
  }

  getJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/jobs`);
  }

  getPublishers(): Observable<Publisher[]> {
    return this.http.get<Publisher[]>(`${this.apiUrl}/publishers`);
  }

  inviteEmployee(employee: EmployeeInviteRequest): Observable<EmployeeInviteResponse> {
    return this.http.post<EmployeeInviteResponse>(`${this.apiUrl}/employees/invite`, employee);
  }

  updateEmployee(empId: string, employee: EmployeeUpdateRequest): Observable<EmployeeUpdateResponse> {
    return this.http.put<EmployeeUpdateResponse>(`${this.apiUrl}/employees/${empId}`, employee);
  }

  deleteEmployee(empId: string): Observable<EmployeeDeleteResponse> {
    return this.http.delete<EmployeeDeleteResponse>(`${this.apiUrl}/employees/${empId}`);
  }
}