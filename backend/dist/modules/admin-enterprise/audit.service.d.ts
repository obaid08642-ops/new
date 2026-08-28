import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
export interface AuditEntryInput {
    action: string;
    actor: {
        id?: string;
        full_name?: string;
        email?: string;
        role?: string;
    };
    target_type: string;
    target_id: string;
    reason?: string;
    before?: any;
    after?: any;
    meta?: Record<string, any>;
    ip?: string;
    user_agent?: string;
}
export declare class AdminAuditService {
    private readonly conn;
    private readonly bus?;
    private readonly logger;
    constructor(conn: Connection, bus?: EventEmitter2);
    write(entry: AuditEntryInput): Promise<void>;
    list(filter: {
        action?: string;
        admin_id?: string;
        target_type?: string;
        target_id?: string;
        from?: string;
        to?: string;
    }, page?: number, limit?: number): Promise<{
        data: any[];
        total: number;
        page: number;
        pages: number;
    }>;
}
