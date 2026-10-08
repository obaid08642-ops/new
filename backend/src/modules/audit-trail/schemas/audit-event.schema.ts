import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Phase 23.1 — one audit trail for every actor.
 *
 * Collection: `audit_events`.
 *
 * APPEND-ONLY: there are no update/delete routes for this collection and the
 * schema hooks below reject any update operation at the driver level. History
 * leaves this collection only through the retention job (23.5), which itself
 * writes a `retention.purge` event first.
 */
@Schema({ collection: 'audit_events', timestamps: true })
export class AuditEvent {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;

  /** who: actor id + role (+ impersonator when an admin acts as someone else). */
  @Prop({ type: Object, required: true })
  actor: { id?: string; role: string; impersonator?: { id?: string; role?: string } };

  /** what: action dotted name, e.g. `auth.login.success`, `order.cancelled`. */
  @Prop({ required: true, index: true }) action: string;

  /** entity the action happened to. */
  @Prop({ type: Object, index: true })
  entity?: { type: string; id?: string };

  /** before/after diff of the changed fields (secrets redacted by callers). */
  @Prop({ type: Object }) diff?: { before?: any; after?: any };

  /** when: server time, always set by the backend (never trusted from client). */
  @Prop({ default: () => new Date(), index: true }) at: Date;

  /** where: network + device attribution. */
  @Prop({ type: Object })
  where?: { ip?: string; device_id?: string; user_agent?: string; platform?: string; app_version?: string };

  /** why: required for admin and financial actions (enforced by callers). */
  @Prop() why?: string;

  /** request id from phase 20.1 correlation. */
  @Prop({ index: true }) request_id?: string;

  /** 23.3 hash chain: hash of the previous event; null for the first event. */
  @Prop({ default: null }) prev_hash: string | null;

  /** 23.3 hash chain: SHA-256 over prev_hash + canonical event body. */
  @Prop({ required: true, unique: true }) hash: string;

  /**
   * Retention category driving 23.5 periods:
   * auth | order | booking | payment | insurance | clinical | consent | admin | export | security | other
   */
  @Prop({ default: 'other', index: true }) category?: string;

  /** 23.5: when true, the retention job must skip this event. */
  @Prop({ default: false, index: true }) legal_hold?: boolean;

  /** Archive sync state for the daily object-storage copy (23.3). */
  @Prop({ default: 'ok' }) sync_status?: 'ok' | 'pending_sync';
}

export type AuditEventDocument = AuditEvent & Document;
export const AuditEventSchema = SchemaFactory.createForClass(AuditEvent);
AuditEventSchema.index({ createdAt: -1 });
AuditEventSchema.index({ 'actor.id': 1, at: -1 });
AuditEventSchema.index({ 'entity.type': 1, 'entity.id': 1, at: 1 });
AuditEventSchema.index({ category: 1, at: 1 });

// ── Append-only enforcement (driver-level; there are no update/delete routes) ──
const APPEND_ONLY_ERROR = 'audit_events is append-only and cannot be modified';
AuditEventSchema.pre('findOneAndUpdate', function (next) {
  return next(new Error(APPEND_ONLY_ERROR));
});
AuditEventSchema.pre('updateOne', function (next) {
  return next(new Error(APPEND_ONLY_ERROR));
});
AuditEventSchema.pre('updateMany', function (next) {
  return next(new Error(APPEND_ONLY_ERROR));
});
AuditEventSchema.pre('findOneAndDelete', function (next) {
  return next(new Error(APPEND_ONLY_ERROR));
});
AuditEventSchema.pre('deleteOne', function (next) {
  return next(new Error(APPEND_ONLY_ERROR));
});
AuditEventSchema.pre('deleteMany', function (next) {
  return next(new Error(APPEND_ONLY_ERROR));
});
