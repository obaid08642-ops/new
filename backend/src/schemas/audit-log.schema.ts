import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * AuditLog — Append-only immutable audit trail.
 * 
 * Enforcement:
 * - Pre-save hook prevents updates to existing documents
 * - No delete/update methods exposed in AuditService
 * - TTL index handles retention (7 years for audit/security)
 * - Critical severity logs are excluded from auto-cleanup
 */
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

// Prevent updates to existing audit log documents (append-only enforcement)
AuditLogSchema.pre('findOneAndUpdate', function (next) {
  return next(new Error('Audit logs are append-only and cannot be modified'));
});

AuditLogSchema.pre('updateOne', function (next) {
  return next(new Error('Audit logs are append-only and cannot be modified'));
});

AuditLogSchema.pre('updateMany', function (next) {
  return next(new Error('Audit logs are append-only and cannot be modified'));
});

// TTL index for automatic log retention (7 years = 2555 days)
// Critical severity logs are excluded from TTL via partial filter expression
AuditLogSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 2555 * 24 * 60 * 60, // 7 years
    partialFilterExpression: { severity: { $ne: 'critical' } },
    name: 'ttl_auditlogs_7y_non_critical'
  }
);
