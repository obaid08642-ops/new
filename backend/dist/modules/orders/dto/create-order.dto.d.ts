export declare class CreateOrderDto {
    items?: any[];
    cartItems?: any[];
    prescription_id?: string;
    delivery_address?: any;
    notes?: string;
    payment_method?: string;
    delivery_mode?: 'PICKUP' | 'DELIVERY';
    visitType?: string;
    hasInsurance?: boolean;
    insurance_status?: string;
    totalAmount?: number;
    home_visit_fee?: number;
    total_copay?: number;
    coupon_code?: string;
    loyalty_points?: number;
}
