import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @IsOptional()
  @IsNumber()
  amount?: number;


  @IsOptional()
  @IsObject()
  billing_data?: Record<string, unknown>;

}

export class VerifyPaymentDto {
  @IsOptional()
  @IsObject()
  obj?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  hmac?: string;

}
