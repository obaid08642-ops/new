import { IsArray, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class OrderInsuranceDto {
  @IsDefined()
  @IsArray()
  items: any[];

  copay_percent?: any;

  @IsOptional()
  insurer_share?: any;

  @IsOptional()
  nphies_approval_code?: any;

  @IsOptional()
  policy_number?: any;

  @IsOptional()
  member_id?: any;

}

export class LabCoverageDto {
  bookingCoverageDecision?: any;

}

export class RadCoverageDto {
  bookingCoverageDecision?: any;

}

export class NursingCoverageDto {
  bookingCoverageDecision?: any;

}

export class PostCrmDto {
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

  @IsOptional()
  blocked?: any;

  @IsOptional()
  blocked_reason?: any;

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

  @IsOptional()
  blocked?: any;

  @IsOptional()
  blocked_reason?: any;

}

export class CreateReferralDto {
  @IsOptional()
  patient_id?: any;

  @IsOptional()
  target_type?: any;

  @IsOptional()
  @IsString()
  notes: string;

  @IsOptional()
  appointment_id?: any;

  @IsOptional()
  target_provider_id?: any;

  @IsOptional()
  destination_provider_id?: any;

  @IsOptional()
  target_name?: any;

  @IsDefined()
  @IsArray()
  requested_tests: any[];

  @IsOptional()
  urgent?: any;

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
