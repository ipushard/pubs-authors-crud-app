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
  SalesOrder,
  SalesOrderCreateRequest,
  SalesOrderCreateResponse,
  SalesOrderDeleteResponse,
  SalesOrderDetails,
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

  getOrders(): Observable<SalesOrder[]> {
    return this.http.get<SalesOrder[]>(`${this.apiUrl}/orders`);
  }

  getOrderDetails(
    storeId: string,
    orderNumber: string
  ): Observable<SalesOrderDetails> {
    return this.http.get<SalesOrderDetails>(
      `${this.apiUrl}/orders/${storeId}/${encodeURIComponent(orderNumber)}`
    );
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

  createOrder(order: SalesOrderCreateRequest): Observable<SalesOrderCreateResponse> {
    return this.http.post<SalesOrderCreateResponse>(`${this.apiUrl}/orders`, order);
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

  deleteOrder(
    storeId: string,
    orderNumber: string
  ): Observable<SalesOrderDeleteResponse> {
    return this.http.delete<SalesOrderDeleteResponse>(
      `${this.apiUrl}/orders/${storeId}/${encodeURIComponent(orderNumber)}`
    );
  }

  emailSaleSummary(emailRequest: SaleEmailRequest): Observable<SaleEmailResponse> {
    return this.http.post<SaleEmailResponse>(`${this.apiUrl}/email-summary`, emailRequest);
  }
}