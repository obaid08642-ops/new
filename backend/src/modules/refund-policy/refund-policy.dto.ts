import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsNumber, Max, Min, ValidateNested } from 'class-validator';

// PUT admin/refund-policy: the whole table (the admin page sends back what GET returned). The rules are the same as the handler's own checks.
export class ConsultationRefundDto {
  @IsDefined() @IsNumber() @Min(0) full_refund_min_hours: number;
  @IsDefined() @IsNumber() @Min(0) @Max(100) late_refund_percent: number;
  @IsDefined() @IsNumber() @Min(0) @Max(100) patient_no_show_percent: number;
  @IsDefined() @IsNumber() @Min(0) free_reschedules: number;
  @IsDefined() @IsNumber() @Min(0) free_reschedule_min_hours: number;
}

export class HomeVisitRefundDto {
  @IsDefined() @IsNumber() @Min(0) trip_fee_sar: number;
  @IsDefined() @IsNumber() @Min(0) @Max(100) patient_absent_percent: number;
}

export class PharmacyRefundDto {
  @IsDefined() @IsBoolean() refund_delivery_fee_before_dispatch: boolean;
}

export class RefundPolicyDto {
  @IsDefined() @ValidateNested() @Type(() => ConsultationRefundDto) consultation: ConsultationRefundDto;
  @IsDefined() @ValidateNested() @Type(() => HomeVisitRefundDto) home_visit: HomeVisitRefundDto;
  @IsDefined() @ValidateNested() @Type(() => PharmacyRefundDto) pharmacy: PharmacyRefundDto;
}
