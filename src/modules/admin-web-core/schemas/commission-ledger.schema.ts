import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommissionLedgerDocument = CommissionLedger & Document;

@Schema({ timestamps: true })
export class CommissionLedger {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ required: true })
  providerName: string;

  @Prop({ type: String, enum: ['doctor', 'pharmacy', 'home_care'], required: true })
  providerType: string;

  @Prop({ required: true })
  baseBill: number;

  @Prop({ required: true })
  systemCommission: number;

  @Prop({ required: true })
  vatOnCommission: number;

  @Prop({ required: true })
  providerEarning: number;
}

export const CommissionLedgerSchema = SchemaFactory.createForClass(CommissionLedger);
