import { IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class ResolveDto {
  @IsDefined()
  @IsIn(['refund_full', 'refund_partial', 'reject', 'close_no_action'])
  decision: string;

  @IsDefined()
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  /** Money decisions require the booking the refund executes against (A2). */
  @IsOptional()
  @IsString()
  booking_kind?: string;

  @IsOptional()
  @IsString()
  booking_id?: string;
}
