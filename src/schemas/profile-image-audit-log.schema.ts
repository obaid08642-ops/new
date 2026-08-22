import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'profile_image_audit_logs' })
export class ProfileImageAuditLog extends Document {
  @Prop({ required: true, index: true }) user_id: string; // owner_id
  @Prop({ required: true, index: true }) provider_id: string; // owner_id
  @Prop({ required: true, default: Date.now }) processing_date: Date;
  @Prop({ required: true }) selected_provider: string; // 'local-webp-processor'
  @Prop({ required: true, default: -1 }) api_key_index_used: number; // -1 for none
  @Prop({ required: true, enum: ['success', 'failed'] }) processing_result: string;
  @Prop() failure_reason?: string;
}
export type ProfileImageAuditLogDocument = ProfileImageAuditLog & Document;
export const ProfileImageAuditLogSchema = SchemaFactory.createForClass(ProfileImageAuditLog);
ProfileImageAuditLogSchema.index({ user_id: 1, createdAt: -1 });
