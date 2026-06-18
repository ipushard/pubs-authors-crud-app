import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AdminSale,
  SaleCreateRequest,
  SaleCreateResponse,
  SaleDeleteResponse,
  SaleEmailRequest,
  SaleEmailResponse,
  SaleUpdateRequest,
  SaleUpdateResponse,
  SalesStore,
  SalesTitle
} from '../models/admin-sale';

@Injectable({
  providedIn: 'root'
})
export class AdminSaleService {

  private apiUrl = 'http://localhost:3000/api/sales';

  constructor(private http: HttpClient) {}

  getSales(): Observable<AdminSale[]> {
    return this.http.get<AdminSale[]>(this.apiUrl);
  }

  getStores(): Observable<SalesStore[]> {
    return this.http.get<SalesStore[]>(`${this.apiUrl}/stores`);
  }

  getTitles(): Observable<SalesTitle[]> {
    return this.http.get<SalesTitle[]>(`${this.apiUrl}/titles`);
  }

  createSale(sale: SaleCreateRequest): Observable<SaleCreateResponse> {
    return this.http.post<SaleCreateResponse>(this.apiUrl, sale);
  }

  updateSale(
    storeId: string,
    orderNumber: string,
    titleId: string,
    sale: SaleUpdateRequest
  ): Observable<SaleUpdateResponse> {
    return this.http.put<SaleUpdateResponse>(
      `${this.apiUrl}/${storeId}/${encodeURIComponent(orderNumber)}/${titleId}`,
      sale
    );
  }

  deleteSale(
    storeId: string,
    orderNumber: string,
    titleId: string
  ): Observable<SaleDeleteResponse> {
    return this.http.delete<SaleDeleteResponse>(
      `${this.apiUrl}/${storeId}/${encodeURIComponent(orderNumber)}/${titleId}`
    );
  }

  emailSaleSummary(emailRequest: SaleEmailRequest): Observable<SaleEmailResponse> {
    return this.http.post<SaleEmailResponse>(`${this.apiUrl}/email-summary`, emailRequest);
  }
}