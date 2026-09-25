import { IsArray, IsBoolean, IsDateString, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDtoGen2 {
  @IsOptional()
  @IsString()
  title?: string;


  @IsOptional()
  @IsString()
  description?: any;

  @IsOptional()
  @IsString()
  assignee?: string;

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
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsNumber()
  sort?: number;


  @IsOptional()
  @IsBoolean()
  active?: boolean;


}

export class CreateDto4 {
  @IsDefined()
  @IsString()
  code: string;

  @IsOptional()
  @IsNumber()
  discount_percent?: number;

  @IsOptional()
  @IsNumber()
  discount_amount?: number;

  @IsOptional()
  @IsNumber()
  max_uses?: number;

  @IsOptional()
  @IsDateString()
  valid_from?: string;

  @IsOptional()
  @IsDateString()
  valid_until?: string;

  @IsOptional()
  @IsNumber()
  min_order?: number;

  @IsOptional()
  @IsNumber()
  max_discount?: number;

  @IsOptional()
  @IsNumber()
  usage_limit_per_user?: number;

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsArray()
  categories?: unknown[];

  @IsOptional()
  @IsBoolean()
  first_order_only?: boolean;

  @IsOptional()
  @IsString()
  campaign_id?: string;
}

export class CreateDto5 {
  @IsDefined()
  @IsString()
  title_ar: string;

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  title_en?: string;

  @IsOptional()
  @IsNumber()
  original_price?: number;

  @IsOptional()
  @IsNumber()
  discounted_price?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsObject()
  target_parameters?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  status?: string;


}

export class UploadDto {
  @IsOptional()
  @IsObject()
  rows?: Record<string, unknown>;


}
