import { IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class ToggleDto {
  @IsDefined()
  @IsBoolean()
  value: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateDto {
  @IsOptional()
  @IsNumber()
  commission?: number;

  @IsOptional()
  @IsNumber()
  commission_cash?: number;

  @IsOptional()
  @IsNumber()
  commission_insurance?: number;
}

export class B2bDecisionDto {
  @IsOptional()
  @IsString()
  note?: string;
}
