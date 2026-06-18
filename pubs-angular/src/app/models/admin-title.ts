export interface AdminTitle {
  title_id: string;
  title: string;
  type: string;
  pub_id: string;
  price: number | null;
  advance: number | null;
  royalty: number | null;
  ytd_sales: number | null;
  notes: string | null;
  pubdate: string;

  pub_name: string | null;
}

export interface TitleCreateRequest {
  title_id: string;
  title: string;
  type: string;
  pub_id: string;
  price: number | null;
  advance: number | null;
  royalty: number | null;
  ytd_sales: number | null;
  notes: string | null;
  pubdate: string;
}

export interface TitleUpdateRequest {
  title: string;
  type: string;
  pub_id: string;
  price: number | null;
  advance: number | null;
  royalty: number | null;
  ytd_sales: number | null;
  notes: string | null;
  pubdate: string;
}

export interface TitleCreateResponse {
  message: string;
  title: AdminTitle;
}

export interface TitleUpdateResponse {
  message: string;
}

export interface TitleDeleteResponse {
  message: string;
}