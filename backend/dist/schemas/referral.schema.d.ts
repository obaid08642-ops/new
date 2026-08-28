import { Document } from 'mongoose';
export type ReferralCodeDocument = ReferralCode & Document;
export declare class ReferralCode {
    id: string;
    ownerId: string;
    code: string;
    useCount: number;
}
export declare const ReferralCodeSchema: import("mongoose").Schema<ReferralCode, import("mongoose").Model<ReferralCode, any, any, any, Document<unknown, any, ReferralCode, any, {}> & ReferralCode & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReferralCode, Document<unknown, {}, import("mongoose").FlatRecord<ReferralCode>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ReferralCode> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export type ReferralRewardDocument = ReferralReward & Document;
export declare class ReferralReward {
    id: string;
    referrerId: string;
    refereeId: string;
    rewardType: 'points' | 'wallet';
    amount: number;
    status: 'pending' | 'completed';
}
export declare const ReferralRewardSchema: import("mongoose").Schema<ReferralReward, import("mongoose").Model<ReferralReward, any, any, any, Document<unknown, any, ReferralReward, any, {}> & ReferralReward & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReferralReward, Document<unknown, {}, import("mongoose").FlatRecord<ReferralReward>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ReferralReward> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
