import { Document, Types } from 'mongoose';
export type CommissionLedgerDocument = CommissionLedger & Document;
export declare class CommissionLedger {
    providerId: Types.ObjectId;
    providerName: string;
    providerType: string;
    baseBill: number;
    systemCommission: number;
    vatOnCommission: number;
    providerEarning: number;
}
export declare const CommissionLedgerSchema: import("mongoose").Schema<CommissionLedger, import("mongoose").Model<CommissionLedger, any, any, any, Document<unknown, any, CommissionLedger, any, {}> & CommissionLedger & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CommissionLedger, Document<unknown, {}, import("mongoose").FlatRecord<CommissionLedger>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CommissionLedger> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
