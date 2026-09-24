import { IsOptional } from 'class-validator';

export class CreateDto {
  @IsOptional()
  title_ar?: any;

  @IsOptional()
  title_en?: any;

  @IsOptional()
  excerpt_ar?: any;

  @IsOptional()
  excerpt_en?: any;

  @IsOptional()
  body_ar?: any;

  @IsOptional()
  body_en?: any;

  @IsOptional()
  category?: any;

  @IsOptional()
  tags?: any;

  @IsOptional()
  cover_image?: any;

  @IsOptional()
  author_name?: any;

  @IsOptional()
  author_title?: any;

  @IsOptional()
  seo_description_ar?: any;

  @IsOptional()
  seo_description_en?: any;

}
