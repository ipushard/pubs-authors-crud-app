export interface Author {
  au_id: string;
  au_lname: string;
  au_fname: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  contract: boolean;
  is_active: boolean;
}