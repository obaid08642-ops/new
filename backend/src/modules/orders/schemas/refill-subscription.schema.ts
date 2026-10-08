import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RefillSubscriptionDocument = RefillSubscription & Document;

@Schema({ collection: 'refill_subscriptions', timestamps: true })
export class RefillSubscription {
  @Prop({ required: true, index: true })
  patient_id: string;

  @Prop({ required: true })
  source_order_id: string;

  @Prop({ type: [{ 
    medicine_id: { type: String, required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    requires_prescription: { type: Boolean, required: true },
    active_ingredient: { type: String },
    rx_validity_days: { type: Number, default: 90 },
  }], required: true })
  items: Array<{
    medicine_id: string;
    name: string;
    qty: number;
    requires_prescription: boolean;
    active_ingredient?: string;
    rx_validity_days: number;
  }>;

  @Prop({ required: true, enum: ['daily', 'weekly', 'monthly', 'custom'] })
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';

  @Prop({ required: true })
  interval_days: number;

  @Prop({ required: true })
  next_refill_at: Date;

  @Prop({ required: true, enum: ['active', 'paused', 'cancelled', 'expired'] })
  status: 'active' | 'paused' | 'cancelled' | 'expired';

  @Prop({ type: Object })
  delivery_address?: Record<string, any>;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Number, default: 0 })
  refill_count: number;

  @Prop({ type: Date })
  last_refill_at?: Date;

  @Prop({ type: Date })
  cancelled_at?: Date;

  @Prop({ type: String })
  cancellation_reason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const RefillSubscriptionSchema = SchemaFactory.createForClass(RefillSubscription);

RefillSubscriptionSchema.index({ patient_id: 1, status: 1 });
RefillSubscriptionSchema.index({ next_refill_at: 1, status: 1 });
RefillSubscriptionSchema.index({ source_order_id: 1 });
