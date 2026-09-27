import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProcurementRequestDocument = ProcurementRequest & Document;

@Schema({ timestamps: true })
export class ProcurementRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  pharmacy_id: Types.ObjectId;

  @Prop({ type: Array, required: true })
  items: any[];

  @Prop({ type: Number, default: 0 })
  total_warehouse_quotation_price: number;

  @Prop({ type: String, enum: ['PENDING_ADMIN_REVIEW', 'QUOTATION_ISSUED', 'COMPLETED'], default: 'PENDING_ADMIN_REVIEW' })
  status: string;
}

export const ProcurementRequestSchema = SchemaFactory.createForClass(ProcurementRequest);
