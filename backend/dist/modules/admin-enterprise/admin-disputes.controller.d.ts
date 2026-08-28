import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
import { WalletService } from '../wallet/wallet.service';
export declare class AdminDisputesController {
    private readonly conn;
    private readonly audit;
    private readonly wallet;
    private readonly maxRefund;
    constructor(conn: Connection, audit: AdminAuditService, wallet: WalletService);
    private static DISPUTE_CATEGORIES;
    list(status?: string, category?: string, q?: string, page?: string, limit?: string): Promise<{
        data: {
            id: any;
            tracking_id: any;
            patient: {
                id: any;
                name: any;
                phone: any;
            };
            category: any;
            subject: any;
            message: any;
            status: any;
            priority: any;
            source_role: any;
            refunded_so_far: number;
            created_at: any;
            resolved_at: any;
        }[];
        stats: {
            [k: string]: any;
        };
        total: number;
        page: number;
        pages: number;
    }>;
    detail(id: string): Promise<any>;
    resolve(id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        decision: string;
        credited_amount: number;
        status: string;
    }>;
}
