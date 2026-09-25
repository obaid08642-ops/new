import { IsArray, IsBoolean, IsDateString, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  service_id?: any;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;


  @IsOptional()
  service_name_ar?: any;

  @IsOptional()
  address?: any;

  @IsOptional()
  payment_method?: any;

}

export class RespondDto {
  @IsOptional()
  accept?: any;

  @IsOptional()
  action?: any;

  @IsOptional()
  reason?: any;

}

export class AssignDto {
  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  provider_name?: string;

  @IsOptional()
  @IsString()
  nurse_id?: string;

  @IsOptional()
  @IsString()
  nurse_name?: string;

  @IsOptional()
  @IsString()
  nurse_phone?: string;
}

export class CheckInDto {
  @IsOptional()
  checklist?: any;

}

export class GpsDto {
  @IsOptional()
  lat?: any;

  @IsOptional()
  lng?: any;

}

export class VisitReportDto {
  @IsOptional()
  @IsBoolean()
  complete?: boolean;

  @IsOptional()
  @IsObject()
  vitals?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clinical_notes?: string;

  @IsOptional()
  @IsString()
  procedure_notes?: string;

  @IsOptional()
  medication_administered?: unknown;

  @IsOptional()
  consumables_used?: unknown;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsString()
  follow_up_instructions?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completed_tasks?: string[];

  @IsOptional()
  @IsObject()
  vitals_logged?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

export class CreateCarePlanDto {
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsObject()
  tasks?: Record<string, unknown>;


  @IsOptional()
  @IsString()
  description: string;

}

export class SetAvailabilityDto {
  @IsOptional()
  @IsBoolean()
  online?: boolean;

  @IsOptional()
  @IsBoolean()
  available_now?: boolean;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

export class InventoryRequestDto {
  @IsDefined()
  @IsArray()
  items: any[];

  @IsOptional()
  booking_id?: any;

}

export class PostMessageDto {
  @IsOptional()
  content?: any;

  @IsOptional()
  text?: any;

  @IsOptional()
  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  type: any[];

  @IsOptional()
  @IsString()
  attachment_url?: string;


  @IsOptional()
  @IsString()
  attachment_mime?: string;


  @IsOptional()
  @IsString()
  attachment_name?: string;


  @IsOptional()
  @IsNumber()
  attachment_size?: number;


  @IsOptional()
  @IsNumber()
  duration_seconds?: number;


  @IsOptional()
  @IsString()
  reply_to_id?: string;


  @IsOptional()
  @IsString()
  forwarded_from_id?: string;


  @IsOptional()
  @IsString()
  client_message_id?: string;


  @IsOptional()
  @IsString()
  media_ids?: string;


  @IsOptional()
  trim?: any;

}

export class PostLegacyDto {
  @IsOptional()
  text?: any;

  @IsOptional()
  content?: any;

  @IsOptional()
  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  type: any[];

  @IsOptional()
  @IsString()
  attachment_url?: string;


  @IsOptional()
  @IsString()
  attachment_mime?: string;


  @IsOptional()
  @IsString()
  attachment_name?: string;


  @IsOptional()
  @IsNumber()
  attachment_size?: number;


  @IsOptional()
  @IsNumber()
  duration_seconds?: number;


  @IsOptional()
  @IsString()
  reply_to_id?: string;


  @IsOptional()
  @IsString()
  forwarded_from_id?: string;


  @IsOptional()
  @IsString()
  client_message_id?: string;


  @IsOptional()
  @IsString()
  media_ids?: string;


  @IsOptional()
  trim?: any;

}

export class ProviderSendDto {
  @IsOptional()
  @IsString()
  thread_id?: string;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsString()
  appointment_id?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  type: any[];

  @IsOptional()
  attachment_url?: any;

  @IsOptional()
  attachment_mime?: any;

  @IsOptional()
  attachment_name?: any;

  @IsOptional()
  attachment_size?: any;

  @IsOptional()
  duration_seconds?: any;

  @IsOptional()
  reply_to_id?: any;

  @IsOptional()
  forwarded_from_id?: any;

  @IsOptional()
  client_message_id?: any;

  @IsOptional()
  media_ids?: any;

  @IsOptional()
  trim?: any;

}
