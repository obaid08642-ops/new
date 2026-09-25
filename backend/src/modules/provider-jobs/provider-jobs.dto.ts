import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AcceptDto {
  @IsOptional()
  reason?: any;

  act?: any;

  @IsOptional()
  CONFIRMED?: any;

}

export class RejectDto {
  @IsOptional()
  reason?: any;

  act?: any;

  @IsOptional()
  CANCELLED?: any;

}

export class StartDto {
  @IsOptional()
  reason?: any;

  act?: any;

  @IsOptional()
  IN_PROGRESS?: any;

}

export class CompleteDto {
  @IsOptional()
  reason?: any;

  act?: any;

  @IsOptional()
  COMPLETED?: any;

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
