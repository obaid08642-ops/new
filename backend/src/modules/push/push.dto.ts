import { IsDefined, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsObject()
  data?: Record<string, unknown>;

}

export class UnregisterPushDto {
  @IsDefined()
  @IsString()
  token: string;
}

export class WebPushKeysDto {
  @IsDefined()
  @IsString()
  p256dh: string;

  @IsDefined()
  @IsString()
  auth: string;
}

export class WebSubscribeDto {
  @IsDefined()
  @IsString()
  endpoint: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => WebPushKeysDto)
  keys: WebPushKeysDto;

  @IsOptional()
  @IsString()
  user_agent?: string;
}

export class WebUnsubscribeDto {
  @IsDefined()
  @IsString()
  endpoint: string;
}

export class SendCampaignDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  target?: string;
}
