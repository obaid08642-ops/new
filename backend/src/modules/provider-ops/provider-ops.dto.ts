import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

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
  reason?: any;

}

export class PutCrmDto {
  @IsDefined()
  @IsString()
  tags: string;

  @IsDefined()
  @IsArray()
  notes: any[];

  @IsOptional()
  vip?: any;

  @IsOptional()
  favorite?: any;

}

export class QcDto {
  @IsOptional()
  note?: any;

  @IsOptional()
  reason?: any;

}

export class ChecklistDto {
  @IsOptional()
  items?: any;

}

export class SignDto {
  @IsOptional()
  signature?: any;

  @IsOptional()
  signer_name?: any;

}

export class TrackDto {
  @IsOptional()
  lat?: any;

  @IsOptional()
  lng?: any;

}

export class EscalateDto {
  @IsOptional()
  reason?: any;

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
  pricing?: any;

}

export class ReplyReviewDto {
  @IsOptional()
  reply?: any;

}

export class PutHoursDto {
  @IsOptional()
  hours?: any;

}

export class EndConsultationDto {
  @IsOptional()
  appointment_id?: any;

  @IsOptional()
  id?: any;

  @IsOptional()
  notes?: any;

  @IsOptional()
  diagnosis?: any;

  @IsDefined()
  @IsArray()
  prescription: any[];

  @IsOptional()
  patient_id?: any;

  amount?: any;

}
