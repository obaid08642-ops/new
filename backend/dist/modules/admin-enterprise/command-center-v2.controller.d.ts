import { MessageEvent } from '@nestjs/common';
import { Connection } from 'mongoose';
import { Observable } from 'rxjs';
export declare class AdminCommandCenterV2Controller {
    private readonly conn;
    constructor(conn: Connection);
    snapshot(): Promise<{
        ts: string;
        tiles: {
            orders_active: number;
            labs_active: number;
            radiology_active: number;
            nursing_active: number;
            appointments_today: number;
            sos_open: number;
            tickets_open: number;
            revenue_24h_sar: number;
            payments_24h: number;
            sla_breach_total: number;
        };
    }>;
    initial(): Promise<{
        ts: string;
        tiles: {
            orders_active: number;
            labs_active: number;
            radiology_active: number;
            nursing_active: number;
            appointments_today: number;
            sos_open: number;
            tickets_open: number;
            revenue_24h_sar: number;
            payments_24h: number;
            sla_breach_total: number;
        };
    }>;
    stream(): Observable<MessageEvent>;
}
