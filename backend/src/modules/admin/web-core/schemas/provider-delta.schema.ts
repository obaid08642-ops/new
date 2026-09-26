import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProviderDeltaDocument = ProviderDelta & Document;

@Schema({ timestamps: true })
export class ProviderDelta {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  provider_id: Types.ObjectId;

  @Prop({ type: String, enum: ['DOCTOR', 'PHARMACY', 'LAB', 'RADIOLOGY'], required: true })
  provider_type: string;

  @Prop({ type: Object, required: true })
  old_profile_snapshot: Record<string, any>;

  @Prop({ type: Object, required: true })
  proposed_new_metadata: Record<string, any>;

  @Prop({ type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true })
  status: string;
}

export const ProviderDeltaSchema = SchemaFactory.createForClass(ProviderDelta);
