import { Connection } from 'mongoose';
import { LedgerService } from '../finance-engine/finance-engine.module';
export declare class ProviderPayoutsController {
    private readonly conn;
    private readonly ledger;
    constructor(conn: Connection, ledger: LedgerService);
    private get withdrawals();
    private get ledgerEntries();
    private validateIban;
    private balanceForReservation;
    request(user: any, body: {
        amount?: number;
        idempotency_key?: string;
    }): Promise<any>;
    mine(user: any): Promise<any[]>;
    balance(user: any): Promise<{
        available: number;
        pending: number;
        locked: number;
        lifetime_earned: number;
        paid_out: number;
        debits: number;
        negative: boolean;
    }>;
}
