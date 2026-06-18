export interface LoginRequest {
  email: string;
  password: string;
}



export interface LoggedInUser {
  user_id: number;
  emp_id: string;
  email: string;
  is_admin: boolean;


  fname: string;
  minit: string | null;
  lname: string;

  job_id: number;
  job_desc: string;
  job_lvl: number;
  pub_id: string;
  hire_date: string;

}



export interface LoginResponse {
  message: string;
  token: string;
  user: LoggedInUser;

  
}