import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MedicalSupplyRequestDocument = MedicalSupplyRequest & Document;

@Schema({ timestamps: true })
export class MedicalSupplyRequest {
  @Prop({ type: Types.ObjectId, ref: 'HomeCareBooking', required: true, index: true })
  booking_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  nurse_id: Types.ObjectId;

  @Prop({
    type: [{
      item_name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, default: 'pcs' },
      status: { type: String, enum: ['PENDING', 'APPROVED', 'DISPATCHED', 'DELIVERED'], default: 'PENDING' }
    }],
    required: true,
    default: []
  })
  requested_items: any[];

  @Prop({ type: String, default: 'NORMAL', enum: ['NORMAL', 'URGENT', 'CRITICAL'] })
  priority: string;
}

export const MedicalSupplyRequestSchema = SchemaFactory.createForClass(MedicalSupplyRequest);
