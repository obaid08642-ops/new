import { IsDefined, IsOptional, IsString } from 'class-validator';

export class SendDto {
  @IsOptional()
  user_id?: any;

  @IsOptional()
  role?: any;

  @IsOptional()
  title_key?: any;

  @IsOptional()
  body_key?: any;

  @IsOptional()
  title?: any;

  @IsOptional()
  body?: any;

  @IsOptional()
  params?: any;

  @IsOptional()
  type?: any;

  @IsOptional()
  priority?: any;

  @IsOptional()
  action?: any;

  @IsOptional()
  scheduled_at?: any;

}

export class ScheduleDto {
  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  user_id?: any;

  @IsOptional()
  role?: any;

  @IsOptional()
  title_key?: any;

  @IsOptional()
  body_key?: any;

  @IsOptional()
  title?: any;

  @IsOptional()
  body?: any;

  @IsOptional()
  params?: any;

  @IsOptional()
  type?: any;

  @IsOptional()
  priority?: any;

  @IsOptional()
  action?: any;

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
