import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
