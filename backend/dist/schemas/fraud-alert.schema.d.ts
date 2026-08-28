import { Document } from 'mongoose';
export type FraudAlertDocument = FraudAlert & Document;
export declare class FraudAlert {
    id: string;
    userId: string;
    providerId: string;
    flagType: 'duplicate_reviews_same_ip' | 'rapid_bookings' | 'payment_velocity_abuse';
    confidenceScore: number;
    status: 'pending' | 'flagged' | 'dismissed';
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
