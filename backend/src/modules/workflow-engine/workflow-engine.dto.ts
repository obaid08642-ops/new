import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

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
  specialty?: any;

  @IsOptional()
  insurance?: any;

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
  accepts_insurance?: any;

  @IsOptional()
  facility_accepts_insurance?: any;

  @IsOptional()
  home_visit?: any;

  @IsOptional()
  city?: any;

  @IsDefined()
  location: any;

  @IsOptional()
  max_results?: any;

}
