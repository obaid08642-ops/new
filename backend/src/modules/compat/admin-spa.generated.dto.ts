import { IsArray, IsBoolean, IsDateString, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDtoGen2 {
  @IsOptional()
  @IsString()
  title?: string;


  @IsOptional()
  @IsString()
  description?: any;

  @IsOptional()
  assignee?: any;

  @IsOptional()
  @IsDateString()
  due_date?: string;


}

export class CreateDto2Gen2 {
  @IsOptional()
  @IsString()
  name_ar?: string;


  @IsOptional()
  @IsString()
  code?: string;


  @IsOptional()
  @IsString()
  name_en?: any;

  @IsOptional()
  @IsString()
  @IsNumber()
  sort?: number;


}

export class CreateDto3 {
  @IsOptional()
  @IsString()
  title_ar?: string;


  @IsOptional()
  @IsString()
  title_en?: any;

  @IsOptional()
  image_url?: any;

  @IsOptional()
  link?: any;

  @IsOptional()
  @IsNumber()
  sort?: number;


  @IsOptional()
  @IsBoolean()
  active?: boolean;


}

export class CreateDto4 {
  @IsOptional()
  @IsString()
  code?: string;


  discount_percent?: any;

  discount_amount?: any;

  max_uses?: any;

  @IsOptional()
  @IsDateString()
  valid_from?: string;


  @IsOptional()
  @IsDateString()
  valid_until?: string;


  min_order?: any;

  max_discount?: any;

  @IsOptional()
  @IsNumber()
  usage_limit_per_user?: number;


  provider_id?: any;

  @IsOptional()
  @IsArray()
  categories?: unknown[];


  @IsOptional()
  @IsBoolean()
  first_order_only?: boolean;


  campaign_id?: any;

}

export class CreateDto5 {
  @IsOptional()
  @IsString()
  title_ar?: string;


  @IsOptional()
  provider_id?: any;

  @IsOptional()
  @IsString()
  title_en?: any;

  original_price?: any;

  discounted_price?: any;

  @IsOptional()
  @IsDateString()
  start_date?: string;


  @IsOptional()
  @IsDateString()
  end_date?: string;


  @IsOptional()
  image_url?: any;

  @IsOptional()
  target_parameters?: any;

  @IsOptional()
  @IsString()
  status?: string;


}

export class UploadDto {
  @IsOptional()
  @IsObject()
  rows?: Record<string, unknown>;


}
