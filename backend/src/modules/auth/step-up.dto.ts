import { IsEmail, IsOptional, IsString } from 'class-validator';

export class RecoveryStartDto {
  @IsEmail()
  email: string;
}

export class RecoveryRedeemDto {
  @IsEmail()
  email: string;

  @IsString()
  email_code: string;

  @IsOptional()
  @IsString()
  recovery_code?: string;
}
