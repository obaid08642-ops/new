import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
export declare class AdminImpersonationController {
    private readonly conn;
    private readonly jwt;
    private readonly audit;
    constructor(conn: Connection, jwt: JwtService, audit: AdminAuditService);
    start(body: any, me: any, req: any): Promise<{
        session_id: string;
        target: {
            id: any;
            role: any;
            full_name: any;
        };
        expires_at: string;
        warning: string;
    } | {
        token: string;
        session_id: string;
        target: {
            id: any;
            role: any;
            full_name: any;
        };
        expires_at: string;
        warning: string;
    }>;
    revoke(id: string, me: any, body: any): Promise<{
        ok: boolean;
        status: any;
        session_id?: undefined;
    } | {
        ok: boolean;
        status: string;
        session_id: string;
    }>;
    list(me: any): Promise<{
        data: any[];
    }>;
}
