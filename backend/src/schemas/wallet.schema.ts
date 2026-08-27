import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true, collection: 'wallets' })
export class Wallet {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  ownerId: string;

  @Prop({ required: true, enum: ['patient', 'provider'], index: true })
  ownerType: 'patient' | 'provider';

  @Prop({ required: true, default: 0 })
  balance: number;

  @Prop({ type: [{ id: String, type: String, last4: String, holderName: String, expiry: String, isDefault: Boolean, gradient: [String] }], default: [] })
  savedCards: any[];
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
WalletSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });

export type WalletTransactionDocument = WalletTransaction & Document;

@Schema({ timestamps: true, collection: 'wallet_transactions' })
export class WalletTransaction {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  walletId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['credit', 'debit'] })
  type: 'credit' | 'debit';

  @Prop({ required: true, enum: ['booking', 'refund', 'referral', 'commission', 'insurance_escrow'], index: true })
  referenceType: 'booking' | 'refund' | 'referral' | 'commission' | 'insurance_escrow';

  @Prop({ required: true, index: true })
  referenceId: string;

  @Prop({ required: true })
  description: string;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);
WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });
