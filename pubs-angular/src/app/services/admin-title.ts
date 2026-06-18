import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AdminTitle,
  TitleCreateRequest,
  TitleCreateResponse,
  TitleDeleteResponse,
  TitleUpdateRequest,
  TitleUpdateResponse
} from '../models/admin-title';

@Injectable({
  providedIn: 'root'
})
export class AdminTitleService {

  private apiUrl = 'http://localhost:3000/api/admin/titles';

  constructor(private http: HttpClient) {}

  getTitles(): Observable<AdminTitle[]> {
    return this.http.get<AdminTitle[]>(this.apiUrl);
  }

  createTitle(title: TitleCreateRequest): Observable<TitleCreateResponse> {
    return this.http.post<TitleCreateResponse>(this.apiUrl, title);
  }

  updateTitle(titleId: string, title: TitleUpdateRequest): Observable<TitleUpdateResponse> {
    return this.http.put<TitleUpdateResponse>(`${this.apiUrl}/${titleId}`, title);
  }

  deleteTitle(titleId: string): Observable<TitleDeleteResponse> {
    return this.http.delete<TitleDeleteResponse>(`${this.apiUrl}/${titleId}`);
  }
}