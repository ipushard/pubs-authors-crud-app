import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Author } from '../models/author';

@Injectable({
  providedIn: 'root'
})
export class AuthorService {

  private apiUrl = 'http://localhost:3000/api/authors';

  constructor(private http: HttpClient) {}

  getAuthors(status: string = 'active'): Observable<Author[]> {
    return this.http.get<Author[]>(`${this.apiUrl}?status=${status}`);
  }

  getAuthor(id: string): Observable<Author> {
    return this.http.get<Author>(`${this.apiUrl}/${id}`);
  }

  createAuthor(author: Author): Observable<any> {
    return this.http.post(this.apiUrl, author);
  }

  updateAuthor(id: string, author: Author): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, author);
  }

  updateAuthorStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, {
      is_active: isActive
    });
  }

  deleteAuthor(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}