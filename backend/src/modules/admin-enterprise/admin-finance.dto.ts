import { IsOptional } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  rates?: any;

  @IsOptional()
  vat_rate?: any;

}

export class ApprovePayoutDto {
  @IsOptional()
  reason?: any;

}

export class RejectPayoutDto {
  @IsOptional()
  reason?: any;

}
