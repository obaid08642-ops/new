import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  title_ar?: string;

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
  category?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: unknown[];


  @IsOptional()
  @IsString()
  cover_image?: any;

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

  // Issues #849 / #861: the pregnancy week (1-42) the article belongs to ("Read this week").
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(42)
  pregnancy_week?: number;

}

export class UpdateDto extends CreateDto {}
