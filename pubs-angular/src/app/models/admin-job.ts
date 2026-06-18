export interface AdminJob {
  job_id: number;
  job_desc: string;
  min_lvl: number;
  max_lvl: number;
}

export interface JobCreateRequest {
  job_desc: string;
  min_lvl: number;
  max_lvl: number;
}

export interface JobUpdateRequest {
  job_desc: string;
  min_lvl: number;
  max_lvl: number;
}

export interface JobCreateResponse {
  message: string;
  job: AdminJob;
}

export interface JobUpdateResponse {
  message: string;
}

export interface JobDeleteResponse {
  message: string;
}