import { IsPositive, IsNumber, IsOptional, IsString } from 'class-validator';

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
