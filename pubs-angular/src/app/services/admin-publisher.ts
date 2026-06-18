import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AdminPublisher,
  PublisherCreateRequest,
  PublisherCreateResponse,
  PublisherDeleteResponse,
  PublisherUpdateRequest,
  PublisherUpdateResponse
} from '../models/admin-publisher';

@Injectable({
  providedIn: 'root'
})
export class AdminPublisherService {

  private apiUrl = 'http://localhost:3000/api/admin/publishers';

  constructor(private http: HttpClient) {}

  getPublishers(): Observable<AdminPublisher[]> {
    return this.http.get<AdminPublisher[]>(this.apiUrl);
  }

  createPublisher(publisher: PublisherCreateRequest): Observable<PublisherCreateResponse> {
    return this.http.post<PublisherCreateResponse>(this.apiUrl, publisher);
  }

  updatePublisher(pubId: string, publisher: PublisherUpdateRequest): Observable<PublisherUpdateResponse> {
    return this.http.put<PublisherUpdateResponse>(`${this.apiUrl}/${pubId}`, publisher);
  }

  deletePublisher(pubId: string): Observable<PublisherDeleteResponse> {
    return this.http.delete<PublisherDeleteResponse>(`${this.apiUrl}/${pubId}`);
  }
}