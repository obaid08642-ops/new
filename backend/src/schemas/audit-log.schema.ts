import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Phase 23 — the audit trail.
 *
 * 23.1 asks for who / what / when / where / why plus the request id. The first
 * pass stored only some of that, so the missing fields are added here rather
 * than guessed at write time: the writer must fill them, not the reader.
 *
 * 23.3 asks for tamper evidence. Each row carries the hash of the previous row
 * (`prev_hash`) and its own (`hash`), computed over the canonical form of the
 * event. Editing or deleting any row breaks the chain, and `verifyChain`
 * reports where.
 */
@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true, index: true }) action: string; // login_failed, payment_create, refund, admin_force_cancel...

  /* who */
  @Prop({ index: true }) user_id?: string;
  @Prop() role?: string;
  /** 23.1 — set when an admin is acting as somebody else. */
  @Prop({ index: true }) impersonator_id?: string;

  /* what */
  @Prop() resource_kind?: string;
  @Prop({ index: true }) resource_id?: string;
  @Prop({ type: Object }) details?: Record<string, any>;
  /** 23.1 — the changed fields, before and after. */
  @Prop({ type: Object }) changes?: { before?: Record<string, any>; after?: Record<string, any> };

  /* where — 23.1 */
  @Prop() ip?: string;
  @Prop() device_id?: string;
  @Prop() user_agent?: string;
  @Prop() platform?: string;
  @Prop() app_version?: string;

  /* why — required by the plan for admin and financial actions */
  @Prop() reason?: string;

  @Prop({ default: 'info' }) severity: 'info' | 'warn' | 'critical';

  /** 20.1 — ties every event produced by one request together. */
  @Prop({ index: true }) correlation_id?: string;

  /* 23.3 — tamper evidence */
  @Prop({ index: true }) prev_hash?: string;
  @Prop() hash?: string;
  /**
   * 23.3 — a monotonic counter, not the timestamp. Two events written in the
   * same millisecond would otherwise have no defined order, and the chain
   * needs one.
   */
  @Prop({ index: true }) sequence?: number;
}
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
/** The chain is walked in insertion order, so that order must be indexable. */
AuditLogSchema.index({ sequence: 1 });