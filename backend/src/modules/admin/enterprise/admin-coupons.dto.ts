import { IsArray, IsBoolean, IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsDefined()
  @IsString()
  code: string;

  @IsDefined()
  @IsIn(['percent', 'amount'])
  discount_type: string;

  @IsDefined()
  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsNumber()
  min_basket?: number;

  @IsOptional()
  @IsNumber()
  max_discount_cap?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  segments?: string[];

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsNumber()
  usage_limit_total?: number;

  @IsOptional()
  @IsNumber()
  usage_limit_per_user?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  min_basket?: number;

  @IsOptional()
  @IsNumber()
  max_discount_cap?: number;

  @IsOptional()
  @IsNumber()
  usage_limit_total?: number;

  @IsOptional()
  @IsNumber()
  usage_limit_per_user?: number;

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  segments?: string[];

  @IsOptional()
  @IsNumber()
  value?: number;
}

export class ValidateDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  basket_total?: number;

  @IsOptional()
  @IsString()
  user_id?: string;
}

export class RedeemDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  order_id?: string;
}

export class RemoveDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
