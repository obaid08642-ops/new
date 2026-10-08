import { IsDefined, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ApplyDto {
  @IsDefined()
  @IsString()
  code: string;

  /** P22.15 anti-fraud signals (optional, hashed/stored, never raw PII beyond the device id). */
  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class IssueAffiliateDto {
  @IsDefined()
  @IsString()
  name: string;

  /** Commission in basis points (100 = 1%), max 50%. */
  @IsDefined()
  @IsNumber()
  @Min(0)
  @Max(5000)
  commission_bps: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_uses?: number;
}

export class AffiliateSignalDto {
  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  order_id?: string;
}
