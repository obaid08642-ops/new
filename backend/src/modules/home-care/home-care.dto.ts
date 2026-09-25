import { IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsString()
  scheduled_at?: string;

  @IsOptional()
  @IsNumber()
  sessions_count?: number;

  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;

  @IsOptional()
  address?: unknown;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  service_name_ar?: string;
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

export class CreateHomeCareCatalogDto {
  @IsDefined()
  @IsString()
  name_ar: string;

  @IsDefined()
  @IsString()
  name_en: string;

  @IsDefined()
  @IsString()
  category: string;

  @IsDefined()
  @IsNumber()
  price: number;

  @IsDefined()
  @IsString()
  duration: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsString()
  description_en?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  duration_value?: number;

  @IsOptional()
  @IsString()
  image_url?: string;
}

export class UpdateHomeCareCatalogDto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsString()
  description_en?: string;
}
