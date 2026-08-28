import { Response } from 'express';
import { ExportService } from './export.service';
export declare class ExportController {
    private readonly exportService;
    constructor(exportService: ExportService);
    private sendCsvResponse;
    exportPatients(res: Response): Promise<void>;
    exportAppointments(res: Response): Promise<void>;
    exportOrders(res: Response): Promise<void>;
    exportTransactions(res: Response): Promise<void>;
    exportAuditLogs(res: Response): Promise<void>;
}
