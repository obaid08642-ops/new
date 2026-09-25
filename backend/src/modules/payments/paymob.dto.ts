import { IsNumber, IsOptional } from 'class-validator';

export class InitiatePaymentDto {
  @IsOptional()
  @IsNumber()
  amount?: number;


  @IsOptional()
  billing_data?: any;

}

export class VerifyPaymentDto {
  @IsOptional()
  obj?: any;

  @IsOptional()
  hmac?: any;

}
