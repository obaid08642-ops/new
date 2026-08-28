import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum DeltaStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true, collection: 'provider_deltas' })
export class ProviderDelta extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  
  // The proposed changes
  @Prop({ type: Object, required: true }) changes: Record<string, any>;
  
  @Prop({ required: true, enum: Object.values(DeltaStatus), default: DeltaStatus.PENDING }) status: DeltaStatus;
  
  @Prop() rejection_reason?: string;
  @Prop() reviewed_by?: string;
  @Prop() reviewed_at?: Date;
}

export const ProviderDeltaSchema = SchemaFactory.createForClass(ProviderDelta);
