import { IsArray, IsDateString, IsDefined, IsNumber, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttributionDto } from '../../common/attribution';
import { NursingBookingChoiceFields } from '../home-care/booking-mode';

export class ManualRequestDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export class SendDto {
  @IsOptional()
  @IsString()
  text: string;

}

export class AddDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsDefined()
  @IsString()
  dosage: string;

  @IsOptional()
  @IsString()
  form?: string;


  @IsDefined()
  @IsArray()
  times: any[];

  @IsOptional()
  @IsString()
  source?: string;


}

export class RegisterDto {
  @IsOptional()
  @IsString()
  kind: string;

  @IsDefined()
  @IsString()
  name: string;

}

export class IngestDto {
  @IsOptional()
  @IsArray()
  samples: any[];

}

export class CreateDto {
  @IsOptional()
  @IsArray()
  items: any[];

  @IsOptional()
  @IsString()
  prescription_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ManualRequestDto)
  manual_request?: ManualRequestDto;

  @IsOptional()
  @IsString()
  delivery_address_id?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  insurance_policy_id?: string;


}

export class BookDto extends NursingBookingChoiceFields {
  @IsOptional()
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsString()
  package_id?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @IsOptional()
  @IsString()
  address_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  insurance_policy_id?: string;


  // D-25: the fields HomeCareSvc.book reads. Without them the /home-care/bookings alias refused every
  // real booking (provider_id is required there) once the older duplicate route stopped shadowing it.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  provider_id?: string;

  // free-form: the visit address the apps send ({ lat, lng, address, ... }), stored as given.
  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  // free-form: the contact name/phone the apps send for the visit.
  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  sessions_count?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AttributionDto)
  attribution?: AttributionDto;
}

export class BareSendDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
export class SendDto2 {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
export class BatchDto {
  @IsOptional()
  @IsArray()
  events?: any[];
}
export class CheckDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  drugs?: string[];

  @IsOptional()
  @IsString()
  drug?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meds?: string[];

  @IsOptional()
  @IsString()
  newDrug?: string;
}
export class SendMessageDto {
  @IsOptional()
  @IsString()
  body?: string;
}
export class AddNoteToActiveDto {
  @IsOptional()
  @IsString()
  patient_id?: string;

  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsOptional()
  @IsObject()
  vitals?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  note?: string;
}
export class AddNoteDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  body?: string;
}
export class VerifyGpsDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsNumber()
  radius?: number;
}
export class ReportShortageDto {
  @IsOptional()
  @IsString()
  product_name?: string;

  @IsOptional()
  @IsString()
  medicine_id?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
export class VoiceToOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;
}
