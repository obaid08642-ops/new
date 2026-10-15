import { IsArray, IsDateString, IsDefined, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

  // Issues #849 / #861: the pregnancy week (1-42) the article belongs to ("Read this week"); null clears it.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(42)
  pregnancy_week?: number | null;

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
