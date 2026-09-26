import { IsArray, IsBoolean, IsDefined, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {
  @IsDefined() @IsString() code: string;
  @IsDefined() @IsString() name_ar: string;
  @IsDefined() @IsString() name_en: string;
  @IsDefined() @IsIn(['region', 'city', 'district', 'sub_area']) type: string;
  @IsOptional() @IsString() parent_code?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) aliases?: string[];
}

export class UpdateLocationDto {
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) aliases?: string[];
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsObject() coverage?: Record<string, unknown>;
}
