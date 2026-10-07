import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'medical_access_logs' })
export class MedicalAccessLog extends Document {
  @Prop({ required: true, index: true })
  patientId: string;

  @Prop({ required: true, index: true })
  recordId: string;

  @Prop({ required: true, enum: ['diagnosis', 'report', 'prescription', 'insurance', 'lab_result', 'imaging', 'consultation_note'] })
  recordType: string;

  @Prop({ required: true, index: true })
  accessedBy: string;

  @Prop({ required: true, enum: ['patient', 'provider', 'admin', 'system'] })
  accessorRole: string;

  @Prop({ required: true, enum: ['view', 'download', 'print', 'share', 'export'] })
  action: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  reason?: string;

  @Prop({ default: Date.now, index: true })
  accessedAt: Date;
}

export const MedicalAccessLogSchema = SchemaFactory.createForClass(MedicalAccessLog);

// Compound indexes for common queries
MedicalAccessLogSchema.index({ patientId: 1, accessedAt: -1 });
MedicalAccessLogSchema.index({ recordId: 1, accessedAt: -1 });
MedicalAccessLogSchema.index({ accessedBy: 1, accessedAt: -1 });

// TTL index - keep access logs for 7 years (2555 days) for PDPL compliance
MedicalAccessLogSchema.index({ accessedAt: 1 }, { expireAfterSeconds: 2555 * 24 * 60 * 60 });
