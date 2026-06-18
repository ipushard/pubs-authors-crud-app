import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AdminJob,
  JobCreateRequest,
  JobCreateResponse,
  JobDeleteResponse,
  JobUpdateRequest,
  JobUpdateResponse
} from '../models/admin-job';

@Injectable({
  providedIn: 'root'
})
export class AdminJobService {

  private apiUrl = 'http://localhost:3000/api/admin/jobs';

  constructor(private http: HttpClient) {}

  getJobs(): Observable<AdminJob[]> {
    return this.http.get<AdminJob[]>(this.apiUrl);
  }

  createJob(job: JobCreateRequest): Observable<JobCreateResponse> {
    return this.http.post<JobCreateResponse>(this.apiUrl, job);
  }

  updateJob(jobId: number, job: JobUpdateRequest): Observable<JobUpdateResponse> {
    return this.http.put<JobUpdateResponse>(`${this.apiUrl}/${jobId}`, job);
  }

  deleteJob(jobId: number): Observable<JobDeleteResponse> {
    return this.http.delete<JobDeleteResponse>(`${this.apiUrl}/${jobId}`);
  }
}