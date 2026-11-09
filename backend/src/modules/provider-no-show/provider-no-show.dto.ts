import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { DISPUTE_REASON_MAX, DISPUTE_REASON_MIN } from './provider-no-show-rules';

export class DisputeNoShowDto {
  @IsString() @MinLength(DISPUTE_REASON_MIN) @MaxLength(DISPUTE_REASON_MAX) reason: string;
}

export class DecideNoShowDto {
  @IsIn(['uphold_report', 'accept_dispute']) decision: 'uphold_report' | 'accept_dispute';
  @IsString() @MinLength(DISPUTE_REASON_MIN) @MaxLength(DISPUTE_REASON_MAX) note: string;
}
