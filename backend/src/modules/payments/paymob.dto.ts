import { IsOptional } from 'class-validator';

export class InitiatePaymentDto {
  amount?: any;

  @IsOptional()
  billing_data?: any;

}

export class VerifyPaymentDto {
  @IsOptional()
  obj?: any;

  @IsOptional()
  hmac?: any;

}
