import { WalletService } from './wallet.service';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    getBalance(user: any): Promise<{
        balance: number;
    }>;
    getTransactions(user: any, page?: number, limit?: number): Promise<{
        transactions: any;
        total: any;
    }>;
    getSpendingData(user: any): Promise<any>;
    topup(user: any, body: {
        amount: number;
        paymentMethod?: string;
    }): Promise<{
        topup_id: any;
        amount: any;
        status: string;
        moyasar_id: any;
        payment_url: any;
        success: boolean;
        requires_payment: boolean;
    }>;
    confirmTopup(user: any, body: {
        topup_id: string;
    }): Promise<{
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
    getTopup(user: any, id: string): Promise<any>;
    transfer(user: any, body: {
        recipient: string;
        amount: number;
    }): Promise<{
        success: boolean;
        balance: number;
    }>;
    getCards(user: any): Promise<{
        success: boolean;
        cards: any[];
    }>;
    addCard(user: any, body: any): Promise<{
        success: boolean;
        cards: any[];
    }>;
    removeCard(user: any, cardId: string): Promise<{
        success: boolean;
        cards: any[];
    }>;
}
