import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsArray()
  items?: any[];

  @IsOptional()
  @IsArray()
  cartItems?: any[];

  @IsOptional()
  @IsString()
  prescription_id?: string;

  @IsOptional()
  delivery_address?: any;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  delivery_mode?: 'PICKUP' | 'DELIVERY';

  @IsOptional()
  @IsString()
  visitType?: string;

  @IsOptional()
  @IsBoolean()
  hasInsurance?: boolean;

  @IsOptional()
  @IsString()
  insurance_status?: string;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  home_visit_fee?: number;

  @IsOptional()
  @IsNumber()
  total_copay?: number;

  /** E1 S13: validated server-side by CouponService (never trusted as a discount directly). */
  @IsOptional()
  @IsString()
  coupon_code?: string;

  /** E1 S12: capped server-side by LoyaltyRedeemService (max_redeem_percent of the order). */
  @IsOptional()
  @IsNumber()
  loyalty_points?: number;
}
