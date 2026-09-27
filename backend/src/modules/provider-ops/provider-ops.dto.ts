import { ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AddLeaveDto {
  @IsDefined()
  @IsString()
  start_date: string;

  @IsDefined()
  @IsString()
  end_date: string;

  @IsDefined()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SaveTemplateDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsArray()
  items: any[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SaveDxDto {
  @IsDefined()
  @IsString()
  name_ar: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  icd?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BlockDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class PutCrmDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  notes?: Array<{ id?: string; date?: string; text?: string }>;

  @IsOptional()
  @IsBoolean()
  vip?: boolean;

  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

}

export class QcDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reason?: string;

}

export class ChecklistDto {
  @IsOptional()
  @IsObject()
  items?: Record<string, boolean>;
}

export class SignDto {
  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  signer_name?: string;

}

export class TrackDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

}

export class EscalateDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class HandoverDto {
  @IsDefined()
  @IsString()
  hospital_provider_account_id: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/** Ambulance mission vitals as entered on the completion form (free text: "120/80", "88"). */
export class AmbulanceVitalsDto {
  @IsOptional() @IsString() @MaxLength(20) bp?: string;
  @IsOptional() @IsString() @MaxLength(20) hr?: string;
  @IsOptional() @IsString() @MaxLength(20) spo2?: string;
}

export class CompleteDto {
  // provider-app AmbulanceDashboard sends { bp, hr, spo2 }; the service stores it as an object.
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AmbulanceVitalsDto)
  vitals?: AmbulanceVitalsDto;

  @IsOptional()
  @IsString()
  summary: string;

  @IsOptional()
  @IsString()
  outcome: string;

}

export class PutPricingDto {
  @IsOptional()
  @IsObject()
  pricing?: Record<string, unknown>;

}

export class ReplyReviewDto {
  @IsOptional()
  @IsString()
  reply?: string;

}

/** One day of the weekly schedule (provider-app WorkingHoursScreen). */
export class WorkingDayDto {
  @IsIn(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']) day: string;
  @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) open?: string;
  @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) close?: string;
  @IsOptional() @IsBoolean() closed?: boolean;
}

export class PutHoursDto {
  // The app sends the whole week: [{ day, open, close, closed }] (the service stores b.hours).
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WorkingDayDto)
  hours: WorkingDayDto[];

}

/** Nursing shift availability toggles (provider-app NursingScheduleScreen). */
export class ShiftTogglesDto {
  @IsOptional() @IsBoolean() morning?: boolean;
  @IsOptional() @IsBoolean() evening?: boolean;
  @IsOptional() @IsBoolean() night?: boolean;
}

export class ScheduleSettingsDto {
  @IsOptional() @IsObject() @ValidateNested() @Type(() => ShiftTogglesDto) shifts?: ShiftTogglesDto;
  @IsOptional() @IsNumber() maxVisits?: number;
  @IsOptional() @IsBoolean() emergencyReady?: boolean;
}

export class EndConsultationDto {
  @IsOptional()
  @IsString()
  appointment_id?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsDefined()
  @IsArray()
  prescription: any[];

  @IsOptional()
  @IsString()
  patient_id?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;


}
