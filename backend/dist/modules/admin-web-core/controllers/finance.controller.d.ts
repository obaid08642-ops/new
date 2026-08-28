import { Connection, Model } from 'mongoose';
import { CommissionLedger } from '../schemas/commission-ledger.schema';
import { WithdrawalRequest } from '../schemas/withdrawal-request.schema';
import { LedgerService, ApprovalService } from '../../finance-engine/finance-engine.module';
export declare class FinanceController {
    private commissionModel;
    private withdrawalModel;
    private providerWithdrawalModel;
    private readonly conn;
    private readonly ledger;
    private readonly approvals;
    constructor(commissionModel: Model<CommissionLedger>, withdrawalModel: Model<WithdrawalRequest>, providerWithdrawalModel: Model<any>, conn: Connection, ledger: LedgerService, approvals: ApprovalService);
    getCommissions(): Promise<{
        data: (import("mongoose").Document<unknown, {}, CommissionLedger, {}, {}> & CommissionLedger & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
    getPendingWithdrawals(): Promise<{
        data: ({
            id: string;
            source: string;
            providerId: any;
            providerName: any;
            amount: any;
            bankName: any;
            iban: any;
            status: string;
            createdAt: any;
        } | {
            id: any;
            source: string;
            providerId: any;
            providerName: any;
            amount: any;
            iban: any;
            note: any;
            status: string;
            createdAt: any;
        })[];
    }>;
    executePayout(id: string, admin: any): Promise<{
        success: boolean;
        routed_to_approval: boolean;
        operation_id: string;
        message: string;
        amount?: undefined;
        provider_id?: undefined;
        available_after?: undefined;
        source?: undefined;
    } | {
        success: boolean;
        message: string;
        amount: number;
        provider_id: any;
        available_after: number;
        source: string;
        routed_to_approval?: undefined;
        operation_id?: undefined;
    }>;
    rejectPayout(id: string, body: any): Promise<{
        success: boolean;
        withdrawal: any;
        source: string;
    }>;
}
