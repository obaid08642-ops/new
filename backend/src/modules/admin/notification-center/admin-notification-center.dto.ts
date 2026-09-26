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
