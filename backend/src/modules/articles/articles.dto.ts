import { IsArray, IsBoolean, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// P13-R15: cited references on health content.
export class ArticleReferenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  url?: string;
}

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

  @IsOptional()
  @IsString()
  reviewer_name?: string;

  @IsOptional()
  @IsString()
  reviewer_credentials?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleReferenceDto)
  references?: ArticleReferenceDto[];

  @IsOptional()
  @IsBoolean()
  ai_generated?: boolean;

}

export class UpdateDto extends CreateDto {}
