import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsDefined()
  @IsString()
  plate_number: string;

  @IsOptional()
  model?: any;

  @IsOptional()
  year?: any;

  @IsOptional()
  @IsArray()
  equipment: any[];

  @IsOptional()
  paramedic_count?: any;

  has_icu?: any;

  @IsOptional()
  vehicle_type?: any;

  @IsOptional()
  base_city?: any;

  @IsOptional()
  @IsArray()
  documents: any[];

}

export class UpdateDto {
  @IsOptional()
  vehicle_type?: any;

  @IsOptional()
  @IsString()
  plate_number: string;

}

export class RejectDto {
  @IsOptional()
  reason?: any;

}
