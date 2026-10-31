import { IsArray, IsBoolean, IsDefined, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @IsOptional()
  @IsString()
  @MaxLength(40)
  booking_kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  booking_id?: string;
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

  @IsOptional()
  @IsString()
  @MaxLength(40)
  booking_kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  booking_id?: string;
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

/**
 * "Share your feedback" (patient-app settings/help?tab=feedback, patient-web /settings/help): the patient's words, an
 * optional rating and the kind of feedback. The app sends the rating as positive / neutral / negative and the kind
 * as `category`; the web sends the stars (0-5) as `rating` and the kind as `type`.
 */
export const FEEDBACK_RATINGS = ['positive', 'neutral', 'negative', 0, 1, 2, 3, 4, 5] as const;
export class FeedbackDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsIn([...FEEDBACK_RATINGS])
  rating?: (typeof FEEDBACK_RATINGS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;
}
