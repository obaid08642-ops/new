import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * F74: diagnostics parent order — one order containing lab + radiology
 * lines, paid once for the total. Children are the real lab/radiology
 * bookings; rollback cancels created children on failure.
 */
@Schema({ timestamps: true, collection: 'diagnostic_orders' })
export class DiagnosticOrder {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ type: [Object], default: [] }) lines: Array<{
    kind: 'lab' | 'radiology';
    service_id: string;
    provider_account_id?: string;
    booking_id?: string;
    price?: number;
    status?: string;
  }>;
  @Prop({ default: 0 }) total: number;
  @Prop({ default: 'SAR' }) currency: string;
  @Prop({ default: 'pending' }) payment_status: string;
  @Prop({ default: 'DRAFT' }) status: string;
  @Prop() scheduled_at?: Date;
  @Prop() paid_at?: Date;
  @Prop() transaction_id?: string;
}
export type DiagnosticOrderDocument = DiagnosticOrder & Document;
export const DiagnosticOrderSchema = SchemaFactory.createForClass(DiagnosticOrder);
DiagnosticOrderSchema.index({ patient_id: 1, createdAt: -1 });
