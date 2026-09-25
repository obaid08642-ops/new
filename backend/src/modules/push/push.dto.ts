import { IsDefined, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
  @IsDefined()
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  provider?: string;


  @IsOptional()
  @IsString()
  platform?: string;


  @IsOptional()
  @IsString()
  device_id?: string;


  @IsOptional()
  @IsString()
  device_name?: string;


}

export class TrackDto {
  @IsDefined()
  @IsString()
  event: string;

  @IsOptional()
  @IsString()
  notification_id?: string;


  @IsOptional()
  @IsString()
  campaign_id?: string;


  @IsOptional()
  data?: any;

}
