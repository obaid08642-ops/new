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
  @Prop({ enum: ['initiating', 'pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'], default: 'pending', index: true }) status: string;
  @Prop() idempotency_key?: string;
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
// At most one gateway-intent reservation may be active for a booking. Deployment
// must run the duplicate-active-intent preflight documented in Phase 8 before
// building this index against existing production data.
TransactionSchema.index(
  { booking_kind: 1, booking_id: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['initiating', 'pending', 'authorized'] } }, name: 'transaction_one_active_intent_per_booking' },
);
TransactionSchema.index(
  { patient_id: 1, booking_kind: 1, booking_id: 1, idempotency_key: 1 },
  { unique: true, partialFilterExpression: { idempotency_key: { $type: 'string' } }, name: 'transaction_booking_idempotency_key' },
);
TransactionSchema.index(
  { gateway: 1, gateway_intent_id: 1 },
  { unique: true, partialFilterExpression: { gateway_intent_id: { $type: 'string' } }, name: 'transaction_gateway_intent_reference' },
);
