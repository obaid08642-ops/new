import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AcceptDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RejectDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class StartDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CompleteDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class InsuranceDto {
  @IsOptional()
  @IsString()
  approvalStatus?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  copay?: number;

  @IsOptional()
  @IsNumber()
  coverage?: number;

  @IsOptional()
  @IsString()
  approval_code?: string;

  @IsOptional()
  @IsString()
  policyNumber?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  diagnosisCode?: string;

  @IsOptional()
  @IsString()
  insuranceCompany?: string;

  @IsOptional()
  @IsString()
  planCategory?: string;

  @IsOptional()
  @IsNumber()
  coveragePercentage?: number;

  @IsOptional()
  @IsNumber()
  coveredAmount?: number;

  @IsOptional()
  @IsNumber()
  copayAmount?: number;

  @IsOptional()
  @IsNumber()
  patientShare?: number;

  @IsOptional()
  @IsNumber()
  insuranceShare?: number;
}
