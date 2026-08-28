import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type ReferralCodeDocument = ReferralCode & Document;

@Schema({ timestamps: true, collection: 'referral_codes' })
export class ReferralCode {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  ownerId: string;

  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ default: 0 })
  useCount: number;
}

export const ReferralCodeSchema = SchemaFactory.createForClass(ReferralCode);

export type ReferralRewardDocument = ReferralReward & Document;

@Schema({ timestamps: true, collection: 'referral_rewards' })
export class ReferralReward {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  referrerId: string;

  @Prop({ required: true, index: true })
  refereeId: string;

  @Prop({ required: true, enum: ['points', 'wallet'] })
  rewardType: 'points' | 'wallet';

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['pending', 'completed'], default: 'pending', index: true })
  status: 'pending' | 'completed';
}

export const ReferralRewardSchema = SchemaFactory.createForClass(ReferralReward);
ReferralRewardSchema.index({ referrerId: 1, refereeId: 1 }, { unique: true });
