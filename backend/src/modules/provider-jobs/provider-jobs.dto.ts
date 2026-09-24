import { IsOptional } from 'class-validator';

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
  approvalStatus?: any;

}
