import { IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

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
  title_ar?: any;

  @IsOptional()
  title_en?: any;

  @IsOptional()
  original_price?: any;

  @IsOptional()
  discounted_price?: any;

  @IsOptional()
  start_date?: any;

  @IsOptional()
  end_date?: any;

  @IsOptional()
  target_parameters?: any;

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
  suspended?: any;

}

export class ClaimResubmitDto {
  @IsOptional()
  @IsIn(["reject"])
  reason: string;

  @IsOptional()
  @IsIn(["resubmit"])
  updated_documents: string;

}

export class ClaimApproveDto {
  @IsOptional()
  @IsIn(["reject"])
  reason: string;

  @IsOptional()
  @IsIn(["resubmit"])
  updated_documents: string;

}

export class ClaimRejectDto {
  @IsOptional()
  @IsIn(["reject"])
  reason: string;

  @IsOptional()
  @IsIn(["resubmit"])
  updated_documents: string;

}
