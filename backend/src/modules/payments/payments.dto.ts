import { IsBoolean, IsDateString, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

/**
 * Q86: the body Moyasar actually posts to a webhook (Moyasar dashboard →
 * webhooks). Moyasar authenticates it with secret_token, not a header.
 */
export class MoyasarWebhookDto {
  @IsString() id: string;
  @IsString() type: string;
  @IsDateString() created_at: string;
  @IsString() secret_token: string;
  @IsOptional() @IsString() account_name?: string;
  @IsOptional() @IsBoolean() live?: boolean;
  // free-form: Moyasar's payment object; only data.id is read, and the status is re-fetched from the gateway.
  @IsObject() data: Record<string, unknown>;
}

export class RefundPaymentDto {
  // The transaction id comes from the route (:txn), not the body. Requiring it
  // here rejected every real refund payload with 400.
  @IsOptional() @IsString() transaction_id?: string;
  // A refund of 0 or a negative amount is never valid.
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsString() reason?: string;
}

/** F1/R25: real DTO for the diagnostics payment-intent body. */
export class DiagnosticsIntentDto {
  @IsOptional() @IsString() order_id?: string;
  @IsOptional() @IsString() method?: string;
}
