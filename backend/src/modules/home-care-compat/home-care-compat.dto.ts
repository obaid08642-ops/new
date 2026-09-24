import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  service_id?: any;

  @IsOptional()
  scheduled_at?: any;

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
  provider_id?: any;

  @IsOptional()
  provider_name?: any;

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
  complete?: any;

  @IsOptional()
  vitals?: any;

  @IsOptional()
  clinical_notes?: any;

  @IsOptional()
  procedure_notes?: any;

  @IsOptional()
  medication_administered?: any;

  @IsOptional()
  consumables_used?: any;

  @IsOptional()
  recommendations?: any;

  @IsOptional()
  follow_up_instructions?: any;

}

export class CreateCarePlanDto {
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  tasks?: any;

  @IsOptional()
  @IsString()
  description: string;

}

export class SetAvailabilityDto {
  @IsOptional()
  online?: any;

  @IsOptional()
  available_now?: any;

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

export class ProviderSendDto {
  @IsOptional()
  thread_id?: any;

  @IsOptional()
  threadId?: any;

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
