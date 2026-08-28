import { Document } from 'mongoose';
export type FraudAlertDocument = FraudAlert & Document;
export declare class FraudAlert {
    entityId: string;
    entityName: string;
    type: string;
    flagReason: string;
    severity: string;
}
export declare const FraudAlertSchema: import("mongoose").Schema<FraudAlert, import("mongoose").Model<FraudAlert, any, any, any, Document<unknown, any, FraudAlert, any, {}> & FraudAlert & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FraudAlert, Document<unknown, {}, import("mongoose").FlatRecord<FraudAlert>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<FraudAlert> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
