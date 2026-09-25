import { IsArray, IsBoolean, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class MatchDto {
  @IsDefined()
  kind: any;

  @IsOptional()
  @IsArray()
  service_keys?: any[];

  @IsOptional()
  @IsArray()
  service_ids?: any[];

  @IsOptional()
  @IsString()
  specialty?: string;


  @IsOptional()
  @IsString()
  insurance?: string;


  @IsOptional()
  @IsString()
  insurance_company?: string;

  @IsOptional()
  @IsString()
  insurance_network?: string;

  @IsOptional()
  @IsString()
  insurance_class?: string;

  @IsOptional()
  @IsBoolean()
  accepts_insurance?: boolean;


  @IsOptional()
  @IsBoolean()
  facility_accepts_insurance?: boolean;


  @IsOptional()
  @IsBoolean()
  home_visit?: boolean;


  @IsOptional()
  @IsString()
  city?: string;


  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };


  @IsOptional()
  @IsNumber()
  max_results?: number;


}
