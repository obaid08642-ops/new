import { IsArray, IsBoolean, IsDateString, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class OrderInsuranceDto {
  @IsDefined()
  @IsArray()
  items: unknown[];

  @IsOptional()
  @IsNumber()
  copay_percent?: number;

  @IsOptional()
  @IsNumber()
  insurer_share?: number;

  @IsOptional()
  @IsString()
  nphies_approval_code?: string;

  @IsOptional()
  @IsString()
  policy_number?: string;

  @IsOptional()
  @IsString()
  member_id?: string;
}

export class LabCoverageDto {
  @IsDefined()
  @IsIn(['APPROVED_FULL', 'APPROVED_PARTIAL', 'REJECTED'])
  decision: string;

  @IsOptional()
  @IsString()
  decision_reference?: string;

  @IsOptional()
  @IsString()
  approval_code?: string;

  @IsOptional()
  @IsNumber()
  copay_percent?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RadCoverageDto {
  @IsDefined()
  @IsIn(['APPROVED_FULL', 'APPROVED_PARTIAL', 'REJECTED'])
  decision: string;

  @IsOptional()
  @IsString()
  decision_reference?: string;

  @IsOptional()
  @IsString()
  approval_code?: string;

  @IsOptional()
  @IsNumber()
  copay_percent?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class NursingCoverageDto {
  @IsDefined()
  @IsIn(['APPROVED_FULL', 'APPROVED_PARTIAL', 'REJECTED'])
  decision: string;

  @IsOptional()
  @IsString()
  decision_reference?: string;

  @IsOptional()
  @IsString()
  approval_code?: string;

  @IsOptional()
  @IsNumber()
  copay_percent?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PostCrmDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  notes?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsBoolean()
  vip?: boolean;

  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @IsBoolean()
  blocked?: boolean;

  @IsOptional()
  @IsString()
  blocked_reason?: string;
}

export class PutCrmDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  notes?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsBoolean()
  vip?: boolean;

  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @IsBoolean()
  blocked?: boolean;

  @IsOptional()
  @IsString()
  blocked_reason?: string;
}

export class CreateReferralDto {
  @IsDefined()
  @IsString()
  patient_id: string;

  @IsDefined()
  @IsIn(['lab', 'radiology', 'nursing'])
  target_type: string;

  @IsDefined()
  @IsString()
  notes: string;

  @IsOptional()
  @IsString()
  appointment_id?: string;

  @IsOptional()
  @IsString()
  target_provider_id?: string;

  @IsOptional()
  @IsString()
  destination_provider_id?: string;

  @IsOptional()
  @IsString()
  target_name?: string;

  @IsOptional()
  @IsString()
  patient_name?: string;

  @IsOptional()
  @IsArray()
  requested_tests?: unknown[];

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;
}

export class CreatePromotionDto {
  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsOptional()
  @IsString()
  title_en?: string;

  @IsOptional()
  @IsNumber()
  original_price?: number;

  @IsOptional()
  @IsNumber()
  discounted_price?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsObject()
  target_parameters?: Record<string, unknown>;

}

export class CreateTechDto {
  @IsOptional()
  @IsString()
  full_name: string;

  @IsDefined()
  @IsString()
  phone: string;

  @IsDefined()
  @IsString()
  department: string;

  @IsDefined()
  @IsString()
  specialty: string;

}

export class UpdateTechDto {
  @IsOptional()
  @IsBoolean()
  suspended?: boolean;

}

export class PatchAvailabilityDto {
  @IsOptional() @IsBoolean() is_accepting_requests?: boolean;
  @IsOptional() @IsBoolean() instant_available?: boolean;
  @IsOptional() @IsNumber() instant_available_minutes?: number;
  @IsOptional() @IsBoolean() vacation_mode?: boolean;
  @IsOptional() @IsDateString() vacation_from?: string;
  @IsOptional() @IsDateString() vacation_to?: string;
  @IsOptional() @IsArray() @IsObject({ each: true }) weekly_schedule?: Record<string, unknown>[];
  @IsOptional() @IsArray() @IsObject({ each: true }) availability_exceptions?: Record<string, unknown>[];
  @IsOptional() @IsArray() @IsObject({ each: true }) accepted_insurance?: Record<string, unknown>[];
}

export class ClaimResubmitDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  updated_documents?: string[];

}

export class ClaimApproveDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  updated_documents?: string[];

}

export class ClaimRejectDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  updated_documents?: string[];

}
