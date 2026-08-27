import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export enum ApprovalStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true, collection: 'approval_requests' })
export class ApprovalRequest {
  @Prop({ default: () => uuid(), unique: true }) id: string;
  @Prop({ required: true, index: true }) entity_type: 'medicine' | 'provider' | 'facility' | 'service';
  @Prop({ index: true }) entity_id?: string; // Null for creation requests; contains target UUID for modifications
  @Prop({ type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING_REVIEW, index: true })
  status: ApprovalStatus;
  @Prop({ required: true, index: true }) submitted_by: string; // user_id of provider
  @Prop() reviewed_by?: string; // user_id of admin
  @Prop() reviewed_at?: Date;
  @Prop() rejected_reason?: string;
  @Prop({ type: Object, required: true }) change_data: Record<string, any>; // The draft fields
  @Prop({ default: 1 }) version: number;
}
export type ApprovalRequestDocument = ApprovalRequest & Document;
export const ApprovalRequestSchema = SchemaFactory.createForClass(ApprovalRequest);
ApprovalRequestSchema.index({ entity_type: 1, entity_id: 1, status: 1 });
