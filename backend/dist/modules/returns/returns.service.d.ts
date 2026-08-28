import { Connection } from 'mongoose';
import { WalletService } from '../wallet/wallet.service';
import { ReturnRequestRepository } from "./repositories/returnrequest.repository";
import { RefundExecutor } from '../finance-engine/finance-engine.module';
export declare class ReturnsService {
    private readonly returnModel;
    private readonly walletService;
    private readonly refundExec;
    private readonly conn;
    constructor(returnModel: ReturnRequestRepository, walletService: WalletService, refundExec: RefundExecutor, conn: Connection);
    private policy;
    eligibility(userId: string, orderId: string): Promise<{
        order_id: string;
        delivered: boolean;
        within_window: boolean;
        window_days: number;
        eligible: any;
        items: any;
    }>;
    createRequest(userId: string, data: any): Promise<any>;
    myReturns(userId: string): Promise<any>;
    providerReturns(providerId: string): Promise<any[]>;
    getById(id: string, userId: string, userRole: string): Promise<any>;
    adminList(status?: string): Promise<any>;
    adminDecide(id: string, decision: 'approved' | 'rejected', note: string, adminUser: any): Promise<any>;
}
