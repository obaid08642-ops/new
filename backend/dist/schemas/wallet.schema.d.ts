import { Document } from 'mongoose';
export type WalletDocument = Wallet & Document;
export declare class Wallet {
    id: string;
    ownerId: string;
    ownerType: 'patient' | 'provider';
    balance: number;
    savedCards: any[];
}
export declare const WalletSchema: import("mongoose").Schema<Wallet, import("mongoose").Model<Wallet, any, any, any, Document<unknown, any, Wallet, any, {}> & Wallet & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Wallet, Document<unknown, {}, import("mongoose").FlatRecord<Wallet>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Wallet> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export type WalletTransactionDocument = WalletTransaction & Document;
export declare class WalletTransaction {
    id: string;
    walletId: string;
    amount: number;
    type: 'credit' | 'debit';
    referenceType: 'booking' | 'refund' | 'referral' | 'commission' | 'insurance_escrow';
    referenceId: string;
    description: string;
}
export declare const WalletTransactionSchema: import("mongoose").Schema<WalletTransaction, import("mongoose").Model<WalletTransaction, any, any, any, Document<unknown, any, WalletTransaction, any, {}> & WalletTransaction & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WalletTransaction, Document<unknown, {}, import("mongoose").FlatRecord<WalletTransaction>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<WalletTransaction> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
