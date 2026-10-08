import { IsArray, IsBoolean, IsDateString, IsDefined, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString, Matches } from 'class-validator';

/** A dialable phone number: optional +, 7–20 digits, spaces or dashes allowed between digits. */
export const DIALABLE_PHONE = /^\+?\d[\d\s-]{5,18}\d$/;
import { MeditationType, BreathingTechnique } from '../../schemas/mental-health.schema';
import { MoodValue } from '../../schemas/mental-health.schema';

export class LogMoodDto {
  @IsDefined() @IsEnum(MoodValue) mood: MoodValue;
  @IsOptional() @IsNumber() energy_level?: number;
  @IsOptional() @IsNumber() stress_level?: number;
  @IsOptional() @IsNumber() sleep_hours?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsDateString() logged_at?: string;
}

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
  @IsDefined()
  @IsEnum(BreathingTechnique)
  technique: BreathingTechnique;

  @IsOptional()
  @IsNumber()
  rounds?: number;


  @IsOptional()
  @IsNumber()
  duration_seconds?: number;


  @IsOptional()
  @IsDateString()
  logged_at?: string;

}

/** D-8: the "Need urgent help?" number the admin sets; it must be dialable. */
export class UrgentHelpDto {
  @IsDefined()
  @IsString()
  @Matches(DIALABLE_PHONE, { message: 'phone_invalid' })
  phone: string;
}
