import { IsOptional } from 'class-validator';

export class LogMeditationDto {
  @IsOptional()
  type?: any;

  @IsOptional()
  duration_minutes?: any;

  @IsOptional()
  completed?: any;

  @IsOptional()
  logged_at?: any;

}

export class LogBreathingDto {
  @IsOptional()
  technique?: any;

  @IsOptional()
  rounds?: any;

  @IsOptional()
  duration_seconds?: any;

  @IsOptional()
  logged_at?: any;

}

export class AddCrisisContactDto {
  @IsOptional()
  contact_name?: any;

  @IsOptional()
  phone?: any;

  @IsOptional()
  relationship?: any;

  @IsOptional()
  is_professional?: any;

}
