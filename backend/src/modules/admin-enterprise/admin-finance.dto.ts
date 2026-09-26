import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  rates?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  vat_rate?: number;
}

export class ApprovePayoutDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class RejectPayoutDto {
  @IsOptional()
  @IsString()
  reason?: string;

}
