import { IsDateString, IsDefined, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { NotificationType, NotificationPriority } from '../../common/enums';

export class SendDto {
  @IsOptional()
  @IsString()
  user_id?: string;


  @IsOptional()
  @IsString()
  role?: string;


  @IsOptional()
  @IsString()
  title_key?: string;


  @IsOptional()
  @IsString()
  body_key?: string;


  @IsOptional()
  @IsString()
  title?: string;


  @IsOptional()
  @IsString()
  body?: string;


  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  action?: unknown;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;


}

export class ScheduleDto {
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;


  @IsOptional()
  @IsString()
  user_id?: string;


  @IsOptional()
  @IsString()
  role?: string;


  @IsOptional()
  @IsString()
  title_key?: string;


  @IsOptional()
  @IsString()
  body_key?: string;


  @IsOptional()
  @IsString()
  title?: string;


  @IsOptional()
  @IsString()
  body?: string;


  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsObject()
  action?: Record<string, unknown>;
}

export class RegisterTokenDto {
  @IsDefined()
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  device_name?: string;
}
