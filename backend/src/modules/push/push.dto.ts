import { IsDefined, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
  @IsDefined()
  @IsString()
  token: string;

  @IsOptional()
  provider?: any;

  @IsOptional()
  platform?: any;

  @IsOptional()
  device_id?: any;

  @IsOptional()
  device_name?: any;

}

export class TrackDto {
  @IsDefined()
  @IsString()
  event: string;

  @IsOptional()
  notification_id?: any;

  @IsOptional()
  campaign_id?: any;

  @IsOptional()
  data?: any;

}
