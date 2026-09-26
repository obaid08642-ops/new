import { IsArray, IsBoolean, IsDateString, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;


  @IsOptional()
  @IsString()
  service_name_ar?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  payment_method?: string;

}

export class RespondDto {
  @IsOptional()
  @IsBoolean()
  accept?: boolean;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  reason?: string;

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
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];
}

export class GpsDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

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
  @IsString()
  booking_id?: string;

}

export class PostMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  type?: string[];

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


}

export class PostLegacyDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  type?: string[];

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
  @IsString({ each: true })
  type?: string[];

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
  @IsArray()
  media_ids?: unknown[];

}
