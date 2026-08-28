import { ProcurementStatus } from '../enums/procurement-status.enum';
import { CreateProcurementRequestDto } from '../dto/create-procurement-request.dto';
import { AdminCreateQuotationDto } from '../dto/admin-create-quotation.dto';
import { PharmacyQuotationFeedbackDto } from '../dto/pharmacy-quotation-feedback.dto';
import { ProcurementRequestRepository } from "./repositories/procurementrequest.repository";
import { QuotationRepository } from "./repositories/quotation.repository";
export declare class ProcurementService {
    private readonly procurementModel;
    private readonly quotationModel;
    constructor(procurementModel: ProcurementRequestRepository, quotationModel: QuotationRepository);
    createRequest(pharmacyId: string, createdBy: string, dto: CreateProcurementRequestDto): Promise<any>;
    getPharmacyRequests(pharmacyId: string): Promise<any[]>;
    getPharmacyRequest(pharmacyId: string, requestId: string): Promise<any>;
    submitPharmacyFeedback(pharmacyId: string, requestId: string, dto: PharmacyQuotationFeedbackDto): Promise<any>;
    adminListRequests(status?: ProcurementStatus): Promise<any[]>;
    adminGetRequest(requestId: string): Promise<any>;
    adminSummary(): Promise<any>;
    adminExportCsv(requestId: string): Promise<string>;
    adminStartReview(requestId: string): Promise<any>;
    adminCreateQuotation(adminId: string, requestId: string, dto: AdminCreateQuotationDto): Promise<any>;
    adminGetQuotation(requestId: string): Promise<any>;
    adminCancelRequest(requestId: string): Promise<any>;
    adminCompleteRequest(requestId: string): Promise<any>;
}
