import { IsArray, IsBoolean, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

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

export class CompleteDto {
  @IsOptional()
  @IsString()
  vitals: string;

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

export class PutHoursDto {
  @IsOptional()
  @IsNumber()
  hours?: number;

}

export class ScheduleSettingsDto {
  @IsOptional() @IsArray() @IsObject({ each: true }) shifts?: Record<string, unknown>[];
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
