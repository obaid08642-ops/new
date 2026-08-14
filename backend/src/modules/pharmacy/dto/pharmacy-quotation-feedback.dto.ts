import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProcurementStatus } from '../enums/procurement-status.enum';

export class PharmacyQuotationFeedbackDto {
  @IsEnum([
    ProcurementStatus.APPROVED_BY_PHARMACY,
    ProcurementStatus.CANCELLED,
  ])
  status:
    | ProcurementStatus.APPROVED_BY_PHARMACY
    | ProcurementStatus.CANCELLED;

  @IsOptional()
  @IsString()
  pharmacyFeedback?: string;
}
