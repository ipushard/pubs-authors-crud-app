export interface AdminPublisher {
  pub_id: string;
  pub_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface PublisherCreateRequest {
  pub_id: string;
  pub_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface PublisherUpdateRequest {
  pub_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface PublisherCreateResponse {
  message: string;
  publisher: AdminPublisher;
}

export interface PublisherUpdateResponse {
  message: string;
}

export interface PublisherDeleteResponse {
  message: string;
}