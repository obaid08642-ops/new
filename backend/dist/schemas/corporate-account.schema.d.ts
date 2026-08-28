import { Document } from 'mongoose';
export type CorporateAccountDocument = CorporateAccount & Document;
export declare class CorporateAccount {
    id: string;
    companyName: string;
    employeeLimit: number;
    individualCreditLimit: number;
    usedCredit: number;
    billingCycleEnd: Date;
}
export declare const CorporateAccountSchema: import("mongoose").Schema<CorporateAccount, import("mongoose").Model<CorporateAccount, any, any, any, Document<unknown, any, CorporateAccount, any, {}> & CorporateAccount & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CorporateAccount, Document<unknown, {}, import("mongoose").FlatRecord<CorporateAccount>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CorporateAccount> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
