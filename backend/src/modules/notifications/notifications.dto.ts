import { IsDateString, IsDefined, IsOptional, IsString } from 'class-validator';

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
  params?: any;

  @IsOptional()
  type?: any;

  @IsOptional()
  priority?: any;

  @IsOptional()
  action?: any;

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
