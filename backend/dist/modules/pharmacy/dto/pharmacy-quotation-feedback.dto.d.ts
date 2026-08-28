import { ProcurementStatus } from '../enums/procurement-status.enum';
export declare class PharmacyQuotationFeedbackDto {
    status: ProcurementStatus.APPROVED_BY_PHARMACY | ProcurementStatus.CANCELLED;
    pharmacyFeedback?: string;
}
