import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  code?: any;

  @IsOptional()
  discount_type?: any;

  @IsOptional()
  value?: any;

  @IsOptional()
  title_ar?: any;

  @IsOptional()
  description_ar?: any;

  @IsOptional()
  min_basket?: any;

  @IsOptional()
  max_discount_cap?: any;

  @IsDefined()
  @IsArray()
  segments: any[];

  @IsOptional()
  starts_at?: any;

  @IsOptional()
  expires_at?: any;

  @IsOptional()
  usage_limit_total?: any;

  @IsOptional()
  usage_limit_per_user?: any;

  @IsOptional()
  active?: any;

}

export class UpdateDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  active?: any;

  @IsOptional()
  min_basket?: any;

  @IsOptional()
  max_discount_cap?: any;

  @IsOptional()
  usage_limit_total?: any;

  @IsOptional()
  usage_limit_per_user?: any;

  expires_at?: any;

  @IsDefined()
  @IsArray()
  segments: any[];

  @IsOptional()
  value?: any;

}

export class ValidateDto {
  @IsOptional()
  code?: any;

  @IsOptional()
  basket_total?: any;

  @IsOptional()
  @IsString()
  user_id: string;

}

export class RedeemDto {
  @IsOptional()
  code?: any;

  @IsOptional()
  user_id?: any;

  @IsOptional()
  order_id?: any;

}

export class RemoveDto {
  @IsOptional()
  reason?: any;

}
