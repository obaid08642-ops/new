import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  type?: string;

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
  media_ids?: any[];

  @IsOptional()
  trim?: any;
}

export class CreateDirectDto {
  @IsDefined()
  @IsString()
  other_user_id: string;
}
export class CreateGroupDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsArray()
  participant_ids: string[];
}
export class CreateBookingDto {
  @IsDefined()
  @IsString()
  booking_kind: string;

  @IsDefined()
  @IsString()
  booking_id: string;

  @IsOptional()
  @IsString()
  provider_id?: string;
}
export class MarkReadDto {
  @IsOptional()
  @IsString()
  up_to_message_id?: string;
}
export class EditMessageDto {
  @IsDefined()
  @IsString()
  body: string;
}
export class AddReactionDto {
  @IsDefined()
  @IsString()
  emoji: string;
}
export class AddParticipantDto {
  @IsDefined()
  @IsString()
  user_id: string;
}
