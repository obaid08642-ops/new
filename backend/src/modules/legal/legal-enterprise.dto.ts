import { IsArray, IsBoolean, IsDefined, IsOptional } from 'class-validator';

export class SetMatrixDto {
  @IsDefined()
  @IsArray()
  companies: string[];

  @IsOptional()
  networks?: any;

  @IsOptional()
  tiers?: any;
}

export class SetConsentDto {
  @IsDefined()
  @IsBoolean()
  value: boolean;
}
