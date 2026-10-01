import { IsArray, IsBoolean, IsDateString, IsDefined, IsObject, IsOptional, IsString } from 'class-validator';

export class BroadcastDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsDefined()
  @IsString()
  title: string;

  @IsDefined()
  @IsString()
  body: string;

  @IsDefined()
  @IsString()
  segment: string;

  @IsOptional()
  @IsObject()
  deep_link?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  // Required (true) by the service for any audience wider than one user; without it here the
  // ValidationPipe rejected the field, so no segment broadcast could ever be sent.
  @IsOptional()
  @IsBoolean()
  audience_confirmed?: boolean;
}

export class CreateCampaignDto {
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @IsOptional()
  @IsString()
  name: string;

  @IsDefined()
  @IsString()
  title: string;

  @IsDefined()
  @IsString()
  body: string;

  @IsDefined()
  @IsString()
  segment: string;

  @IsOptional()
  @IsObject()
  deep_link?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  audience_confirmed?: boolean;

  @IsOptional()
  @IsArray()
  variants?: Array<Record<string, unknown>>;
}

export class RecurringRuleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsObject()
  audience: { type: string; filters: any };

  @IsDefined()
  @IsString()
  frequency: 'daily' | 'weekly' | 'monthly';

  @IsDefined()
  @IsString()
  sendTime: string;

  @IsDefined()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsDefined()
  @IsObject()
  title: Record<string, string>;

  @IsDefined()
  @IsObject()
  body: Record<string, string>;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  deepLink?: string;

  @IsDefined()
  @IsBoolean()
  enabled: boolean;
}
