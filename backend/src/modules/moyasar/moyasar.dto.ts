import { IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateMoyasarPaymentDto {
  @IsDefined()
  @IsString()
  booking_id: string;

  @IsDefined()
  @IsIn(['pharmacy', 'order', 'orders', 'consultation', 'appointment', 'lab', 'labs', 'radiology', 'nursing', 'home-care', 'homecare', 'insurance', 'insurance-copay', 'copay'])
  booking_kind: string;

  @IsDefined()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  callback_url?: string;
}

export class WebhookDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

}

export class RefundDto {
  @IsOptional()
  @IsNumber()
  amount?: number;
}
