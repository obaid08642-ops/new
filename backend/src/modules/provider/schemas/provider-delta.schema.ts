import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DeltaStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

@Schema({ timestamps: true })
export class ProviderDelta extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ type: Object, required: true })
  oldData: Record<string, any>;

  @Prop({ type: Object, required: true })
  newData: Record<string, any>;

  @Prop({ type: String, enum: Object.values(DeltaStatus), default: DeltaStatus.PENDING })
  status: DeltaStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: String })
  rejectionReason?: string;
}

export const ProviderDeltaSchema = SchemaFactory.createForClass(ProviderDelta);
