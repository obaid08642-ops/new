import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class Review {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true, index: true }) provider_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) booking_kind: string;
  @Prop({ required: true, index: true }) booking_id: string;
  @Prop({ required: true, min: 1, max: 5 }) rating: number;
  @Prop() comment?: string;
  @Prop({ type: Object }) aspects?: { wait?: number; clarity?: number; helpfulness?: number };
  @Prop({ type: String, enum: ['pending_review', 'approved', 'rejected'], default: 'approved', index: true })
  status: 'pending_review' | 'approved' | 'rejected';
}
export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ booking_kind: 1, booking_id: 1 }, { unique: true });
