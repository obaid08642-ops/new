import { Document, Types } from 'mongoose';
export type WithdrawalRequestDocument = WithdrawalRequest & Document;
export declare class WithdrawalRequest {
    providerId: Types.ObjectId;
    providerName: string;
    amount: number;
    bankName: string;
    iban: string;
    status: string;
}
export declare const WithdrawalRequestSchema: import("mongoose").Schema<WithdrawalRequest, import("mongoose").Model<WithdrawalRequest, any, any, any, Document<unknown, any, WithdrawalRequest, any, {}> & WithdrawalRequest & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WithdrawalRequest, Document<unknown, {}, import("mongoose").FlatRecord<WithdrawalRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<WithdrawalRequest> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
