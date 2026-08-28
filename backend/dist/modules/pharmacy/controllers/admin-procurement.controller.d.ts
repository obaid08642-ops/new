import { ProcurementService } from '../services/procurement.service';
import { AdminCreateQuotationDto } from '../dto/admin-create-quotation.dto';
import { ProcurementStatus } from '../enums/procurement-status.enum';
export declare class AdminProcurementController {
    private readonly procurementService;
    constructor(procurementService: ProcurementService);
    listAll(status?: ProcurementStatus): Promise<any[]>;
    summary(): Promise<any>;
    exportCsv(id: string, res: any): Promise<void>;
    getOne(id: string): Promise<any>;
    startReview(id: string): Promise<any>;
    createQuotation(req: any, id: string, dto: AdminCreateQuotationDto): Promise<any>;
    getQuotation(id: string): Promise<any>;
    cancelRequest(id: string): Promise<any>;
    completeRequest(id: string): Promise<any>;
}
