import { Connection } from 'mongoose';
export declare class ExportService {
    private connection;
    constructor(connection: Connection);
    exportToCsv(modelName: string, fields: string[]): Promise<string>;
    exportPatients(): Promise<string>;
    exportAppointments(): Promise<string>;
    exportOrders(): Promise<string>;
    exportTransactions(): Promise<string>;
    exportAuditLogs(): Promise<string>;
}
