import { IsArray, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class EscalateDto {
  @IsOptional()
  @IsIn(["pharmacy"])
  kind: string;

  @IsOptional()
  threshold_minutes?: any;

}

export class AssessDto {
  @IsDefined()
  @IsString()
  booking_id: string;

  @IsDefined()
  @IsString()
  kind: string;

  @IsDefined()
  @IsString()
  patient_id: string;

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  cancelled_at?: any;
}

export class FallbackDto {
  kind: any;

  @IsOptional()
  @IsString()
  exclude_provider_id?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  insurance?: string;

  @IsOptional()
  @IsArray()
  service_keys?: any[];
}
