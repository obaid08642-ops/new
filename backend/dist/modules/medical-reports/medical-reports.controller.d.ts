import { MedicalReportsService } from './medical-reports.service';
import { Connection } from 'mongoose';
export declare class MedicalReportsController {
    private readonly svc;
    private readonly conn;
    constructor(svc: MedicalReportsService, conn: Connection);
    timeline(user: any): Promise<any[]>;
    mine(user: any, type?: string, q?: string, limit?: string): Promise<any>;
    track(user: any, tracking: string): Promise<any>;
    one(user: any, id: string): Promise<any>;
    create(user: any, body: any): Promise<any>;
}
