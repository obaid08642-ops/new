import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true }) booking_kind: string; // pharmacy|lab|radiology|nursing|consultation
  @Prop({ required: true, index: true }) booking_id: string;
  @Prop({ required: true }) patient_id: string;
  @Prop({ required: true }) amount: number;
  @Prop({ default: 'SAR' }) currency: string;
  @Prop({ enum: ['stripe', 'tap', 'moyasar'], default: 'moyasar' }) gateway: string;
  @Prop({ default: 'card' }) method: string; // card|cash|insurance
  @Prop({ enum: ['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'], default: 'pending', index: true }) status: string;
  @Prop() gateway_intent_id?: string;
  @Prop() gateway_charge_id?: string;
  @Prop() client_secret?: string;
  @Prop() checkout_url?: string;
  @Prop({ type: Object }) webhook_payload?: Record<string, any>;
  @Prop() failure_reason?: string;
  @Prop() refund_reason?: string;
  @Prop() refunded_amount?: number;
  @Prop() paid_at?: Date;
  @Prop() refunded_at?: Date;
}
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ booking_kind: 1, booking_id: 1, createdAt: -1 });
