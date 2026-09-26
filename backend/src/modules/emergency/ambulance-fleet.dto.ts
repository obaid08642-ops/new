import { IsArray, IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsDefined()
  @IsString()
  plate_number: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @IsOptional()
  @IsNumber()
  paramedic_count?: number;

  @IsOptional()
  @IsBoolean()
  has_icu?: boolean;

  @IsOptional()
  @IsString()
  vehicle_type?: string;

  @IsOptional()
  @IsString()
  base_city?: string;

  @IsOptional()
  @IsArray()
  documents?: unknown[];
}

export class UpdateDto {
  @IsOptional()
  @IsString()
  vehicle_type?: string;

  @IsOptional()
  @IsString()
  plate_number?: string;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsNumber()
  paramedic_count?: number;

  @IsOptional()
  @IsBoolean()
  has_icu?: boolean;

  @IsOptional()
  @IsString()
  base_city?: string;
}

export class RejectDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
