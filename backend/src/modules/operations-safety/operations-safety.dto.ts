import { IsArray, IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class EscalateDto {
  @IsOptional()
  @IsIn(['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'])
  kind?: string;

  @IsOptional()
  @IsNumber()
  threshold_minutes?: number;


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
  @IsDateString()
  scheduled_at?: string;


  @IsOptional()
  @IsDateString()
  cancelled_at?: string;

}

export class FallbackDto {
  @IsDefined()
  @IsIn(['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'])
  kind: 'pharmacy' | 'lab' | 'radiology' | 'nursing' | 'consultation';

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
