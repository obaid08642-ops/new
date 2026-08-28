import { EventEmitter2 } from '@nestjs/event-emitter';
import { MedicalReportRepository } from "./repositories/medicalreport.repository";
export declare class MedicalReportsService {
    private readonly model;
    private readonly events;
    constructor(model: MedicalReportRepository, events: EventEmitter2);
    list(user: any, opts: {
        type?: string;
        limit?: number;
        q?: string;
    }): Promise<any>;
    one(user: any, id: string): Promise<any>;
    create(user: any, body: any): Promise<any>;
    byTracking(tracking_id: string, user: any): Promise<any>;
}
