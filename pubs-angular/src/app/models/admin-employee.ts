export interface Job {
  job_id: number;
  job_desc: string;
  min_lvl: number;
  max_lvl: number;
}

export interface Publisher {
  pub_id: string;
  pub_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface AdminEmployee {
  emp_id: string;
  fname: string;
  minit: string | null;
  lname: string;
  job_id: number;
  job_lvl: number;
  pub_id: string;
  hire_date: string;

  job_desc: string;
  pub_name: string;

  user_id: number | null;
  email: string | null;
  email_confirmed: boolean | number | null;
  is_admin: boolean | number | null;
  is_active: boolean | number | null;
  invite_sent_at: string | null;
  password_set: boolean | number | null;
}

export interface EmployeeInviteRequest {
  emp_id: string;
  fname: string;
  minit: string | null;
  lname: string;
  email: string;
  job_id: number;
  job_lvl: number;
  pub_id: string;
}

export interface EmployeeInviteResponse {
  message: string;
  inviteLink?: string;
}

export interface EmployeeUpdateRequest {
  fname: string;
  minit: string | null;
  lname: string;
  job_id: number;
  job_lvl: number;
  pub_id: string;
  is_admin: boolean;
  is_active: boolean;
}

export interface EmployeeUpdateResponse {
  message: string;
}

export interface EmployeeDeleteResponse {
  message: string;
}