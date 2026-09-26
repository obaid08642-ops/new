import { IsArray, IsBoolean, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

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
