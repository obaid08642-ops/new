import { IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

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
  // The transaction id comes from the route (:txn), not the body. Requiring it
  // here rejected every real refund payload with 400.
  @IsOptional() @IsString() transaction_id?: string;
  // A refund of 0 or a negative amount is never valid.
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsString() reason?: string;
}
