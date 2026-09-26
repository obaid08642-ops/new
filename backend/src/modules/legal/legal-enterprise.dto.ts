import { IsArray, IsBoolean, IsDefined, IsObject, IsOptional } from 'class-validator';

export class SetMatrixDto {
  @IsDefined()
  @IsArray()
  companies: string[];

  @IsOptional()
  @IsObject()
  networks?: Record<string, string[]>;

  @IsOptional()
  @IsObject()
  tiers?: Record<string, string[]>;
}

export class SetConsentDto {
  @IsDefined()
  @IsBoolean()
  value: boolean;
}
