import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class EraseAccountDto {
  /**
   * The patient re-enters their password to prove the erasure request is theirs. A guest has no password: the guest
   * session itself is the proof (21.8), so the field is optional here and the service refuses a real account without it.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password?: string;

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

// P17-17.6: banner-grade purpose choices — both flags strictly boolean.
export class ConsentChoicesDto {
  @IsBoolean()
  analytics!: boolean;

  @IsBoolean()
  marketing!: boolean;
}
