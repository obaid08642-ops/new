import { ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class ImportLocationCoordinatesDto {
  @IsDefined() @IsNumber() @Min(-90) @Max(90) lat: number;
  @IsDefined() @IsNumber() @Min(-180) @Max(180) lng: number;
}

// P13-R11: one row of a verified official extract (validated again row by
// row in LocationService.importLocations — the DTO is the outer gate).
export class ImportLocationRowDto {
  @IsDefined() @IsString() @Matches(/^[a-z0-9-]{1,80}$/) code: string;
  @IsDefined() @IsString() @MaxLength(200) name_ar: string;
  @IsDefined() @IsString() @MaxLength(200) name_en: string;
  @IsDefined() @IsIn(['region', 'city', 'district', 'sub_area']) type: string;
  @IsOptional() @IsString() @MaxLength(80) parent_code?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) aliases?: string[];
  @IsOptional() @ValidateNested() @Type(() => ImportLocationCoordinatesDto) coordinates?: ImportLocationCoordinatesDto;
}

export class ImportLocationsDto {
  @IsDefined() @IsString() @MaxLength(120) source: string;
  @IsDefined() @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => ImportLocationRowDto) locations: ImportLocationRowDto[];
}
