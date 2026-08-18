import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// ─── LoyaltyAccount ───────────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'loyalty_accounts' })
export class LoyaltyAccount extends Document {
  @Prop({ required: true, unique: true, index: true }) user_id: string;
  @Prop({ default: 0 }) points: number;
  @Prop({ default: 0 }) lifetime_points: number;
  /** 'bronze' | 'silver' | 'gold' | 'platinum' */
  @Prop({ default: 'bronze', index: true }) tier: string;
}
export const LoyaltyAccountSchema = SchemaFactory.createForClass(LoyaltyAccount);

// ─── LoyaltyTransaction ───────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'loyalty_transactions' })
export class LoyaltyTransaction extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) user_id: string;
  /** Positive = earned, Negative = redeemed */
  @Prop({ required: true }) points_delta: number;
  /** e.g. 'booking_completed', 'order_delivered', 'review_submitted', 'reward_claimed' */
  @Prop({ required: true }) reason: string;
  /** 'appointment' | 'order' | 'review' | 'referral' | 'challenge' | 'reward' */
  @Prop() ref_type?: string;
  @Prop() ref_id?: string;
}
export const LoyaltyTransactionSchema = SchemaFactory.createForClass(LoyaltyTransaction);

// ─── LoyaltyChallenge ─────────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'loyalty_challenges' })
export class LoyaltyChallenge extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true }) title_ar: string;
  @Prop({ required: true }) title_en: string;
  @Prop() description?: string;
  /** e.g. 'book_appointment' | 'log_vitals' | 'order_medicine' */
  @Prop({ required: true }) target_action: string;
  @Prop({ required: true, default: 1 }) target_count: number;
  @Prop({ required: true }) reward_points: number;
  @Prop({ required: true }) start_date: Date;
  @Prop({ required: true }) end_date: Date;
  @Prop({ default: true }) active: boolean;
}
export const LoyaltyChallengeSchema = SchemaFactory.createForClass(LoyaltyChallenge);

// ─── ChallengeProgress ────────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'challenge_progress' })
export class ChallengeProgress extends Document {
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ required: true, index: true }) challenge_id: string;
  @Prop({ default: 0 }) progress_count: number;
  @Prop({ default: false }) completed: boolean;
  @Prop() completed_at?: Date;
}
export const ChallengeProgressSchema = SchemaFactory.createForClass(ChallengeProgress);

// ─── Reward ───────────────────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'loyalty_rewards' })
export class Reward extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true }) title_ar: string;
  @Prop({ required: true }) title_en: string;
  @Prop() description?: string;
  @Prop({ required: true }) points_required: number;
  /** 'coupon' | 'cashback' | 'badge' | 'gift' */
  @Prop({ required: true }) reward_type: string;
  /** coupon discount amount or cashback SAR value */
  @Prop() value?: number;
  @Prop() image?: string;
  @Prop({ default: 999 }) stock: number;
  @Prop({ default: true }) active: boolean;
}
export const RewardSchema = SchemaFactory.createForClass(Reward);

// ─── RewardClaim ──────────────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'reward_claims' })
export class RewardClaim extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ required: true }) reward_id: string;
  /** 'pending' | 'fulfilled' | 'cancelled' */
  @Prop({ default: 'pending', index: true }) status: string;
  @Prop() coupon_code?: string;
  @Prop() fulfilled_at?: Date;
}
export const RewardClaimSchema = SchemaFactory.createForClass(RewardClaim);
