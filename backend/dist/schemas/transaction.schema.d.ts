import { Document } from 'mongoose';
export type TransactionDocument = Transaction & Document;
export declare class Transaction {
    id: string;
    booking_kind: string;
    booking_id: string;
    patient_id: string;
    amount: number;
    currency: string;
    gateway: string;
    method: string;
    status: string;
    idempotency_key?: string;
    gateway_intent_id?: string;
    gateway_charge_id?: string;
    client_secret?: string;
    checkout_url?: string;
    webhook_payload?: Record<string, any>;
    failure_reason?: string;
    refund_reason?: string;
    refunded_amount?: number;
    paid_at?: Date;
    refunded_at?: Date;
}
export declare const TransactionSchema: import("mongoose").Schema<Transaction, import("mongoose").Model<Transaction, any, any, any, Document<unknown, any, Transaction, any, {}> & Transaction & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Transaction, Document<unknown, {}, import("mongoose").FlatRecord<Transaction>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Transaction> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
