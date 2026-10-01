import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class WebhookBodyDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class RefundPaymentDto {
  @IsString() transaction_id: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsString() reason?: string;
}
