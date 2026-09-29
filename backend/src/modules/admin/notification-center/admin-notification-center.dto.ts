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
