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
