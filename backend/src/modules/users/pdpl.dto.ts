import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class EraseAccountDto {
  /** The patient re-enters their password to prove the erasure request is theirs. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class RecordConsentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  policy_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  version: string;

  @IsBoolean()
  accepted: boolean;
}
