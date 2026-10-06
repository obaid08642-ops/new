import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true, index: true }) action: string; // login_failed, payment_create, refund, admin_force_cancel...
  @Prop({ index: true }) user_id?: string;
  @Prop() role?: string;
  @Prop() ip?: string;
  @Prop() user_agent?: string;
  @Prop() resource_kind?: string;
  @Prop() resource_id?: string;
  @Prop({ type: Object }) details?: Record<string, any>;
  @Prop({ default: 'info' }) severity: 'info' | 'warn' | 'critical';
  @Prop() correlation_id?: string;
}
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
