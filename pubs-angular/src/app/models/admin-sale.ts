export interface AdminSale {
  stor_id: string;
  ord_num: string;
  ord_date: string;
  qty: number;
  payterms: string;
  title_id: string;

  stor_name: string | null;
  store_city: string | null;
  store_state: string | null;

  title: string | null;
  type: string | null;
  price: number | null;
  pub_id: string | null;

  pub_name: string | null;

  estimated_revenue: number | null;
}

export interface SalesStore {
  stor_id: string;
  stor_name: string;
  stor_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface SalesTitle {
  title_id: string;
  title: string;
  type: string;
  pub_id: string;
  price: number | null;
  pub_name: string | null;
}

export interface SaleCreateRequest {
  stor_id: string;
  ord_num: string;
  ord_date: string;
  qty: number;
  payterms: string;
  title_id: string;
}

export interface SaleUpdateRequest {
  ord_date: string;
  qty: number;
  payterms: string;
}

export interface SaleCreateResponse {
  message: string;
  sale: AdminSale;
}

export interface SaleUpdateResponse {
  message: string;
}

export interface SaleDeleteResponse {
  message: string;
}

export interface SaleEmailRequest {
  to: string;
  sale: AdminSale;
}

export interface SaleEmailResponse {
  message: string;
}