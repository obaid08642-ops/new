import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WithdrawalRequestDocument = WithdrawalRequest & Document;

@Schema({ timestamps: true })
export class WithdrawalRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ required: true })
  providerName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  iban: string;

  @Prop({ type: String, enum: ['pending', 'completed'], default: 'pending' })
  status: string;
}

export const WithdrawalRequestSchema = SchemaFactory.createForClass(WithdrawalRequest);
