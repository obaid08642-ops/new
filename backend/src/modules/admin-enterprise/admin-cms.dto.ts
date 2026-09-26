import { IsArray, IsDateString, IsDefined, IsOptional, IsString } from 'class-validator';

export class UpsertDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsDefined()
  @IsString()
  title_ar: string;

  @IsOptional()
  @IsString()
  title_en?: string;

  @IsOptional()
  @IsString()
  excerpt_ar?: string;

  @IsOptional()
  @IsString()
  excerpt_en?: string;

  @IsOptional()
  @IsString()
  body_ar?: string;

  @IsOptional()
  @IsString()
  body_en?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  cover_image?: string;

  @IsOptional()
  @IsString()
  author_name?: string;

  @IsOptional()
  @IsString()
  author_title?: string;

  @IsOptional()
  @IsString()
  seo_description_ar?: string;

  @IsOptional()
  @IsString()
  seo_description_en?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  id?: string;
}

export class PublishDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ScheduleDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}

export class UnpublishDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
