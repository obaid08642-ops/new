import { IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateNoteDto {
  @IsOptional()
  patient_id?: any;

  @IsOptional()
  booking_id?: any;

  @IsOptional()
  note?: any;

  @IsDefined()
  @IsString()
  vitals: string;

}

export class CreateBookingDto {
  @IsOptional()
  service_id?: any;

  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  sessions_count?: any;

  contact?: any;

  @IsOptional()
  address?: any;

  @IsOptional()
  notes?: any;

  @IsOptional()
  payment_method?: any;

}

export class ArriveAtPatientDto {
  @IsDefined()
  @IsNumber()
  lat: number;

  @IsDefined()
  @IsNumber()
  lng: number;
}
export class TriggerEmergencyDto {
  @IsDefined()
  @IsString()
  reason: string;
}
