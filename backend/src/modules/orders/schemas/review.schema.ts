import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ collection: 'reviews', timestamps: true })
export class Review {
  @Prop({ required: true, index: true })
  patient_id: string;

  @Prop({ required: true, enum: ['order', 'booking', 'consultation'] })
  source_type: 'order' | 'booking' | 'consultation';

  @Prop({ required: true })
  source_id: string; // order_id, booking_id, or consultation_id

  @Prop({ required: true })
  provider_id: string; // pharmacy_id, doctor_id, lab_id, etc.

  @Prop({ required: true })
  provider_type: 'pharmacy' | 'doctor' | 'lab' | 'radiology' | 'nurse' | 'hospital';

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String })
  comment?: string;

  @Prop({ type: [String] })
  photos?: string[]; // media IDs from upload

  @Prop({ required: true, enum: ['pending', 'published', 'rejected', 'hidden'] })
  status: 'pending' | 'published' | 'rejected' | 'hidden';

  @Prop({ type: Object })
  moderation?: {
    moderator_id: string;
    reason: string;
    at: Date;
  };

  @Prop({ type: Object })
  provider_reply?: {
    content: string;
    replied_at: Date;
    replied_by: string; // provider staff ID
  };

  @Prop({ type: Number, default: 0 })
  helpful_votes: number;

  @Prop({ type: [String] })
  helpful_voters?: string[]; // patient IDs who voted helpful

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ patient_id: 1, createdAt: -1 });
ReviewSchema.index({ provider_id: 1, status: 1 });
ReviewSchema.index({ source_type: 1, source_id: 1 }, { unique: true });
ReviewSchema.index({ status: 1, createdAt: -1 });
