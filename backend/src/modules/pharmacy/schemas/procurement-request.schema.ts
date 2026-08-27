import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProcurementRequestDocument = ProcurementRequest & Document;

@Schema({ timestamps: true })
export class ProcurementRequest {
  // User ids are UUID strings across the platform (not Mongo ObjectIds) — storing
  // them as ObjectId made every submit/my-requests call throw a CastError.
  @Prop({ type: String, required: true, index: true })
  pharmacy_id: string;

  @Prop({ type: String, required: true })
  created_by: string;

  @Prop({
    type: [{
      medicine_id: { type: Types.ObjectId, ref: 'Medicine', default: null },
      raw_name_string: { type: String, required: true },
      requested_quantity: { type: Number, required: true },
      category_group: { type: String, enum: ['medical', 'non_medical'], default: 'medical' },
      notes: String
    }],
    required: true,
    default: []
  })
  items: any[];

  @Prop({
    type: String,
    enum: ['DRAFT', 'PENDING_ADMIN_REVIEW', 'QUOTATION_ISSUED', 'APPROVED_BY_PHARMACY', 'CANCELLED', 'COMPLETED'],
    default: 'PENDING_ADMIN_REVIEW',
    index: true
  })
  status: string;

  @Prop({ type: String, default: null })
  uploaded_file_url: string; // URL for Excel sheet or scanner images

  @Prop({ type: Number, default: 0 })
  total_warehouse_quotation_price: number;
}
export const ProcurementRequestSchema = SchemaFactory.createForClass(ProcurementRequest);
