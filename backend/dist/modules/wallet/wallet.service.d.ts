import { Connection } from 'mongoose';
import { WalletDocument } from '../../schemas/wallet.schema';
import { WalletRepository } from "./repositories/wallet.repository";
import { WalletTransactionRepository } from "./repositories/wallettransaction.repository";
import { UserRepository } from "./repositories/user.repository";
import { MoyasarService } from '../moyasar/moyasar.module';
export declare class WalletService {
    private walletModel;
    private txModel;
    private userModel;
    private readonly conn;
    private readonly moyasar;
    constructor(walletModel: WalletRepository, txModel: WalletTransactionRepository, userModel: UserRepository, conn: Connection, moyasar: MoyasarService);
    private commissionPercent;
    private debtSuspensionThreshold;
    getOrCreateWallet(ownerId: string, ownerType: 'patient' | 'provider'): Promise<WalletDocument>;
    getBalance(ownerId: string, ownerType: 'patient' | 'provider'): Promise<number>;
    getTransactions(ownerId: string, ownerType: 'patient' | 'provider', page?: number, limit?: number): Promise<{
        transactions: any;
        total: any;
    }>;
    topup(ownerId: string, ownerType: 'patient' | 'provider', amount: number, description?: string, refType?: string, refId?: string): Promise<WalletDocument>;
    createTopupIntent(ownerId: string, ownerType: 'patient' | 'provider', amount: number): Promise<{
        topup_id: any;
        amount: any;
        status: string;
        moyasar_id: any;
        payment_url: any;
    }>;
    confirmTopup(ownerId: string, topupId: string): Promise<{
        topup_id: string;
        status: string;
        amount: any;
        balance: number;
    } | {
        topup_id: string;
        status: any;
        amount: any;
        balance?: undefined;
    }>;
    getTopup(ownerId: string, topupId: string): Promise<any>;
    transfer(senderId: string, ownerType: 'patient' | 'provider', recipientQuery: string, amount: number): Promise<WalletDocument>;
    addCommissionDebt(providerId: string, consultationAmount: number): Promise<WalletDocument>;
    addInsuranceEscrow(providerId: string, insuranceAmount: number): Promise<WalletDocument>;
    getCards(ownerId: string, ownerType: 'patient' | 'provider'): Promise<any[]>;
    addCard(ownerId: string, ownerType: 'patient' | 'provider', cardData: any): Promise<any[]>;
    removeCard(ownerId: string, ownerType: 'patient' | 'provider', cardId: string): Promise<any[]>;
    getSpendingData(ownerId: string, ownerType: 'patient' | 'provider'): Promise<any>;
}
