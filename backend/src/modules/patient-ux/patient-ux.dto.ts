import { IsBoolean, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class RateDto {
  @IsDefined()
  @IsString()
  booking_kind: string;

  @IsDefined()
  @IsString()
  booking_id: string;

  @IsDefined()
  @IsNumber()
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  aspects?: unknown;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;
}

export class RefundDto {
  @IsDefined()
  @IsString()
  booking_kind: string;

  @IsDefined()
  @IsString()
  booking_id: string;

  @IsDefined()
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class RebookDto {
  @IsDefined()
  @IsString()
  booking_kind: string;

  @IsDefined()
  @IsString()
  booking_id: string;

  @IsDefined()
  @IsString()
  scheduled_at: string;
}

export class DecideDto {
  @IsDefined()
  @IsIn(["approved", "rejected"])
  decision: "approved" | "rejected";

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}
export class CancelDto {
  @IsDefined()
  @IsString()
  kind: string;

  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsString()
  reason: string;
}
export class TransitionDto {
  @IsDefined()
  @IsString()
  kind: string;

  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsString()
  state: string;

  @IsDefined()
  @IsString()
  reason: string;
}
export class MarkPaymentDto {
  @IsDefined()
  @IsString()
  kind: string;

  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsIn(["paid", "refunded", "failed"])
  payment_status: "paid" | "refunded" | "failed";

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsDefined()
  @IsString()
  reason: string;
}
