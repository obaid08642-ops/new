import { IsIn, IsPositive, IsNumber, IsOptional, IsString } from 'class-validator';

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

/** Q-6: the method the patient chose for a gateway intent (card, a card wallet, or an insurance co-pay). */
export const INTENT_METHODS = ['card', 'apple-pay', 'google-pay', 'insurance'] as const;

export class IntentMethodDto {
  @IsOptional()
  @IsIn(INTENT_METHODS)
  method?: string;
}

export class DiagnosticsIntentDto {
  @IsString()
  order_id!: string;

  @IsOptional()
  @IsIn(INTENT_METHODS)
  method?: string;
}
