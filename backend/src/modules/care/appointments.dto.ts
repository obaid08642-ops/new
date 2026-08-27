import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '../../schemas/appointment.schema';

export class VisitLocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  doctor_id: string;

  @IsString()
  @IsIn(['clinic', 'video', 'home'])
  service_type: ServiceType;

  @IsString()
  @IsNotEmpty()
  slot_start: string;

  @IsNumber()
  @IsOptional()
  duration_minutes?: number;

  @IsString()
  @IsOptional()
  patient_notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  symptoms?: string[];

  @ValidateNested()
  @Type(() => VisitLocationDto)
  @IsOptional()
  visit_location?: VisitLocationDto;

  @IsString()
  @IsIn(['cash', 'card', 'insurance'])
  @IsOptional()
  payment_method?: 'cash' | 'card' | 'insurance';

  @IsString()
  @IsOptional()
  insurance_provider?: string;

  @IsString()
  @IsOptional()
  insurance_member_id?: string;
}

export class CancelAppointmentDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RescheduleAppointmentDto {
  @IsString()
  @IsNotEmpty()
  slot_start: string;
}
