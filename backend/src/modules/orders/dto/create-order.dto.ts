export class CreateOrderDto {
  items?: any[];
  cartItems?: any[];
  prescription_id?: string;
  delivery_address?: any;
  notes?: string;
  payment_method?: string;
  visitType?: string;
  hasInsurance?: boolean;
  insurance_status?: string;
  totalAmount?: number;
  home_visit_fee?: number;
  total_copay?: number;
}
