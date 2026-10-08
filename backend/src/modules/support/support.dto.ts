import { IsArray, IsBoolean, IsDefined, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDto {
  @IsDefined()
  @IsString()
  subject: string;

  @IsDefined()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];
}

export class CreateTicketDto {
  @IsDefined()
  @IsString()
  subject: string;

  @IsDefined()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];
}

export class CreateSupportDto {
  @IsDefined()
  @IsString()
  subject: string;

  @IsDefined()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];

  @IsOptional()
  @IsString()
  linked_order_id?: string;

  @IsOptional()
  @IsString()
  linked_booking_id?: string;

  @IsOptional()
  @IsBoolean()
  callback_requested?: boolean;

  @IsOptional()
  @IsString()
  callback_phone?: string;

  @IsOptional()
  @IsString()
  callback_preferred_time?: string;
}

export class AiAssistDto {
  @IsDefined()
  @IsString()
  query: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  context?: Record<string, any>;
}

export class CallbackRequestDto {
  @IsDefined()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  preferred_time?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReplyDto {
  @IsOptional()
  @IsString()
  message?: string;
}

export class AdminUpdateDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;
}

export class FeedbackDto {
  @IsDefined() @IsString() message: string;
  @IsOptional() @IsIn(['positive', 'neutral', 'negative']) rating?: string;
  @IsOptional() @IsString() category?: string;
}

export class SupportSettingsDto {
  @IsOptional() @IsIn(['ar', 'en']) language?: string;
  @IsOptional() @IsIn(['light', 'dark', 'system']) theme?: string;
  @IsOptional() @IsIn(['gregorian', 'hijri']) calendar?: string;
  @IsOptional() @IsBoolean() notifications_enabled?: boolean;
  @IsOptional() @IsBoolean() notif_reminders?: boolean;
  @IsOptional() @IsBoolean() notif_orders?: boolean;
  @IsOptional() @IsBoolean() notif_appointments?: boolean;
  @IsOptional() @IsBoolean() notif_lab_results?: boolean;
  @IsOptional() @IsString() expo_push_token?: string;
}

export class FaqUpsertDto {
  @IsOptional() @IsString() id?: string;
  @IsDefined() @IsString() question_ar!: string;
  @IsOptional() @IsString() question_en?: string;
  @IsDefined() @IsString() answer_ar!: string;
  @IsOptional() @IsString() answer_en?: string;
  @IsOptional() sort?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
