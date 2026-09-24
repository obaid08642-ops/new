import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateDtoGen2 {
  @IsOptional()
  @IsString()
  title?: any;

  @IsOptional()
  @IsString()
  description?: any;

  @IsOptional()
  assignee?: any;

  due_date?: any;

}

export class CreateDto2Gen2 {
  @IsOptional()
  @IsString()
  name_ar?: any;

  @IsOptional()
  @IsString()
  code?: any;

  @IsOptional()
  @IsString()
  name_en?: any;

  @IsOptional()
  @IsString()
  sort?: any;

}

export class CreateDto3 {
  @IsOptional()
  @IsString()
  title_ar?: any;

  @IsOptional()
  @IsString()
  title_en?: any;

  @IsOptional()
  image_url?: any;

  @IsOptional()
  link?: any;

  @IsOptional()
  sort?: any;

  @IsOptional()
  active?: any;

}

export class CreateDto4 {
  @IsOptional()
  @IsString()
  code?: any;

  discount_percent?: any;

  discount_amount?: any;

  max_uses?: any;

  valid_from?: any;

  valid_until?: any;

  min_order?: any;

  max_discount?: any;

  usage_limit_per_user?: any;

  provider_id?: any;

  @IsOptional()
  @IsArray()
  categories?: any;

  @IsOptional()
  first_order_only?: any;

  campaign_id?: any;

}

export class CreateDto5 {
  @IsOptional()
  @IsString()
  title_ar?: any;

  @IsOptional()
  provider_id?: any;

  @IsOptional()
  @IsString()
  title_en?: any;

  original_price?: any;

  discounted_price?: any;

  start_date?: any;

  end_date?: any;

  @IsOptional()
  image_url?: any;

  @IsOptional()
  target_parameters?: any;

  @IsOptional()
  status?: any;

}

export class UploadDto {
  rows?: any;

}
