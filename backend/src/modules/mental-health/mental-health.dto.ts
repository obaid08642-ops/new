import { IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { MeditationType } from '../../schemas/mental-health.schema';

export class LogMeditationDto {
  @IsDefined()
  @IsIn(['guided', 'breathing', 'body_scan', 'sleep', 'mindfulness'])
  type: MeditationType;

  @IsDefined()
  @IsNumber()
  duration_minutes: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  logged_at?: string;
}

export class LogBreathingDto {
  @IsOptional()
  technique?: any;

  @IsOptional()
  @IsNumber()
  rounds?: number;


  @IsOptional()
  @IsNumber()
  duration_seconds?: number;


  @IsOptional()
  logged_at?: any;

}

export class AddCrisisContactDto {
  @IsDefined()
  @IsString()
  contact_name: string;

  @IsDefined()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  @IsBoolean()
  is_professional?: boolean;
}
