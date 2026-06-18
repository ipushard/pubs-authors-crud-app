export interface InviteInfo {
  user_id: number;
  emp_id: string;
  email: string;
  fname: string;
  minit: string | null;
  lname: string;
  job_id: number;
  job_desc: string;
  job_lvl: number;
  pub_id: string;
  hire_date: string;
}

export interface CompleteInviteRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface CompleteInviteResponse {
  message: string;
}