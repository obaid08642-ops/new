import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AlertDocument = Alert & Document;

@Schema({ collection: 'alerts', timestamps: true })
export class Alert {
  @Prop({ required: true, index: true })
  patient_id: string;

  @Prop({ required: true, enum: ['back_in_stock', 'price_drop'] })
  type: 'back_in_stock' | 'price_drop';

  @Prop({ required: true })
  medicine_id: string;

  @Prop({ required: true })
  medicine_name: string;

  @Prop({ type: Number })
  target_price?: number; // For price_drop alerts

  @Prop({ required: true, enum: ['active', 'triggered', 'cancelled'] })
  status: 'active' | 'triggered' | 'cancelled';

  @Prop({ type: Date })
  triggered_at?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index({ patient_id: 1, status: 1 });
AlertSchema.index({ medicine_id: 1, type: 1, status: 1 });
AlertSchema.index({ target_price: 1, status: 1 });
