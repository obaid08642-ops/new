import { Document } from 'mongoose';
export declare class LoyaltyAccount extends Document {
    user_id: string;
    points: number;
    lifetime_points: number;
    tier: string;
}
export declare const LoyaltyAccountSchema: import("mongoose").Schema<LoyaltyAccount, import("mongoose").Model<LoyaltyAccount, any, any, any, Document<unknown, any, LoyaltyAccount, any, {}> & LoyaltyAccount & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LoyaltyAccount, Document<unknown, {}, import("mongoose").FlatRecord<LoyaltyAccount>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LoyaltyAccount> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class LoyaltyTransaction extends Document {
    id: string;
    user_id: string;
    points_delta: number;
    reason: string;
    ref_type?: string;
    ref_id?: string;
}
export declare const LoyaltyTransactionSchema: import("mongoose").Schema<LoyaltyTransaction, import("mongoose").Model<LoyaltyTransaction, any, any, any, Document<unknown, any, LoyaltyTransaction, any, {}> & LoyaltyTransaction & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LoyaltyTransaction, Document<unknown, {}, import("mongoose").FlatRecord<LoyaltyTransaction>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LoyaltyTransaction> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class LoyaltyChallenge extends Document {
    id: string;
    title_ar: string;
    title_en: string;
    description?: string;
    target_action: string;
    target_count: number;
    reward_points: number;
    start_date: Date;
    end_date: Date;
    active: boolean;
}
export declare const LoyaltyChallengeSchema: import("mongoose").Schema<LoyaltyChallenge, import("mongoose").Model<LoyaltyChallenge, any, any, any, Document<unknown, any, LoyaltyChallenge, any, {}> & LoyaltyChallenge & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LoyaltyChallenge, Document<unknown, {}, import("mongoose").FlatRecord<LoyaltyChallenge>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LoyaltyChallenge> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class ChallengeProgress extends Document {
    user_id: string;
    challenge_id: string;
    progress_count: number;
    completed: boolean;
    completed_at?: Date;
}
export declare const ChallengeProgressSchema: import("mongoose").Schema<ChallengeProgress, import("mongoose").Model<ChallengeProgress, any, any, any, Document<unknown, any, ChallengeProgress, any, {}> & ChallengeProgress & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChallengeProgress, Document<unknown, {}, import("mongoose").FlatRecord<ChallengeProgress>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ChallengeProgress> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class Reward extends Document {
    id: string;
    title_ar: string;
    title_en: string;
    description?: string;
    points_required: number;
    reward_type: string;
    value?: number;
    image?: string;
    stock: number;
    active: boolean;
}
export declare const RewardSchema: import("mongoose").Schema<Reward, import("mongoose").Model<Reward, any, any, any, Document<unknown, any, Reward, any, {}> & Reward & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Reward, Document<unknown, {}, import("mongoose").FlatRecord<Reward>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Reward> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class RewardClaim extends Document {
    id: string;
    user_id: string;
    reward_id: string;
    status: string;
    coupon_code?: string;
    fulfilled_at?: Date;
}
export declare const RewardClaimSchema: import("mongoose").Schema<RewardClaim, import("mongoose").Model<RewardClaim, any, any, any, Document<unknown, any, RewardClaim, any, {}> & RewardClaim & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RewardClaim, Document<unknown, {}, import("mongoose").FlatRecord<RewardClaim>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<RewardClaim> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
