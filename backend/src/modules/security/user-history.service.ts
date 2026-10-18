/**
 * Phase 23.6 — what a person may see about themselves.
 *
 * The audit chain is for administrators: it carries hashes, other people's ids and the full origin of every call. This
 * service gives the account holder their own slice of it, and nothing else:
 *  - `activity`: their own sign-in, security and consent events (an allow-list of actions), with a masked address and the
 *    platform instead of the raw origin;
 *  - `statusHistory`: the steps of one of THEIR orders or bookings (as patient, or as the provider who serves it), with who
 *    did each step reduced to you / the other side / the platform.
 * Ownership is checked against the order or booking itself, so an id that is not theirs answers 404, never an empty list.
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/** Account events a person is shown. Everything else in the chain (admin reads, retention, internal) stays admin-only. */
export const ACTIVITY_ACTIONS = [
  'account_registered', 'login_success', 'login_failed', 'otp_requested', 'password_changed', 'session_ended',
  'device_revoked', 'device_changed', 'policy_accepted', 'data_export', 'data_erasure', 'account.linked', 'account.guest_merged',
  'admin_device.enrolled', 'admin_device.revoked',
] as const;

/** Order and booking steps a person is shown. `service.rollback` and the internal allocation chatter are not. */
const STATUS_EVENT = /^(service\.(?!rollback)|pharmacy\.(offer|order)\.|pharmacy\.all_allocations_delivered$)/;

type Kind = 'pharmacy' | 'lab' | 'radiology' | 'nursing' | 'consultation';

interface KindSpec {
  collection: string;
  entityType: string;
  patientFields: string[];
  providerFields: string[];
}

const KINDS: Record<Kind, KindSpec> = {
  pharmacy: { collection: 'pharmacy_orders', entityType: 'order', patientFields: ['patient_account_id'], providerFields: ['pharmacy_account_id'] },
  lab: { collection: 'labbookings', entityType: 'lab_booking', patientFields: ['patient_id'], providerFields: ['provider_account_id'] },
  radiology: { collection: 'radiologybookings', entityType: 'radiology_booking', patientFields: ['patient_id'], providerFields: ['provider_account_id'] },
  nursing: { collection: 'homecarebookings', entityType: 'nursing_booking', patientFields: ['patient_id'], providerFields: ['provider_account_id'] },
  consultation: { collection: 'appointments', entityType: 'appointment', patientFields: ['patient_id'], providerFields: ['doctor_id', 'doctor_user_id', 'provider_account_id'] },
};

export function maskAddress(ip?: string | null): string | null {
  if (!ip) return null;
  const v4 = String(ip).replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.split('.').slice(0, 2).join('.') + '.*.*';
  const parts = v4.split(':');
  return parts.length > 2 ? parts.slice(0, 2).join(':') + ':*' : null;
}

export function platformOf(row: { platform?: string; user_agent?: string }): string | null {
  if (row.platform) return String(row.platform).slice(0, 16);
  const ua = String(row.user_agent || '');
  if (!ua) return null;
  return /iPhone|iPad|iOS/i.test(ua) ? 'ios' : /Android|okhttp/i.test(ua) ? 'android' : 'web';
}

/** The data subject's own audit events, whole. A plain function so the PDPL export can use it without importing the module. */
export async function exportAuditEvents(conn: Pick<Connection, 'collection'>, userId: string, limit = 5000) {
  const rows = await conn.collection('audit_logs')
    .find({ user_id: { $eq: userId } }).sort({ sequence: 1, createdAt: 1 }).limit(limit).toArray();
  return rows.map((r: any) => ({
    at: r.createdAt ?? r.created_at ?? null, action: r.action, role: r.role, resource_kind: r.resource_kind, resource_id: r.resource_id,
    ip: r.ip, device_id: r.device_id, user_agent: r.user_agent, platform: r.platform, app_version: r.app_version,
    reason: r.reason, severity: r.severity, details: r.details, changes: r.changes,
  }));
}

@Injectable()
export class UserHistoryService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  /** The caller's own account activity, newest first. */
  async activity(userId: string, page = 1, limit = 30) {
    const pageN = Math.max(1, Math.floor(page) || 1);
    const limitN = Math.max(1, Math.min(100, Math.floor(limit) || 30));
    const filter = { user_id: { $eq: userId }, action: { $in: [...ACTIVITY_ACTIONS] } };
    const col = this.conn.collection('audit_logs');
    const [rows, total] = await Promise.all([
      col.find(filter).sort({ sequence: -1, createdAt: -1 }).skip((pageN - 1) * limitN).limit(limitN).toArray(),
      col.countDocuments(filter),
    ]);
    return { total, page: pageN, limit: limitN, events: rows.map((r: any) => this.project(r)) };
  }

  /** One audit row as the account holder sees it: no hashes, no ids of other people, a masked address. */
  project(r: any) {
    return {
      id: r.id,
      at: r.createdAt ?? r.created_at ?? null,
      action: r.action,
      outcome: r.action === 'login_failed' ? 'failure' : 'success',
      platform: platformOf(r),
      ip: maskAddress(r.ip),
      device: r.device_id ? `…${String(r.device_id).slice(-4)}` : null,
      reason: r.action === 'login_failed' ? (r.details?.reason ?? null) : null,
    };
  }

  /** Every audit event about the account, whole (the data subject's own export — PDPL). */
  exportEvents(userId: string, limit = 5000) {
    return exportAuditEvents(this.conn, userId, limit);
  }

  /** The steps of one order/booking the caller owns (patient) or serves (provider). */
  async statusHistory(user: { id: string; role?: string }, kindRaw: string, id: string) {
    const kind = KINDS[kindRaw as Kind];
    if (!kind) throw new BadRequestException('invalid_kind');
    if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(id)) throw new BadRequestException('invalid_id');
    const owner = [...kind.patientFields, ...kind.providerFields].map((f) => ({ [f]: { $eq: user.id } }));
    const entity: any = await this.conn.collection(kind.collection).findOne({ id: { $eq: id }, $or: owner }, { projection: { _id: 0, id: 1, patient_account_id: 1, patient_id: 1 } });
    // a pharmacy that has an allocation on the order serves it, even though the order itself names no pharmacy yet
    let served = !!entity;
    if (!served && kindRaw === 'pharmacy') {
      served = !!(await this.conn.collection('pharmacy_allocations').findOne({ order_id: { $eq: id }, pharmacy_account_id: { $eq: user.id } }, { projection: { _id: 1 } }));
    }
    if (!served) throw new NotFoundException('not_found');
    const patientId = entity?.patient_account_id ?? entity?.patient_id ?? null;
    const iAmPatient = patientId === user.id;
    const events = await this.conn.collection('system_events')
      .find({ entity_type: { $eq: kind.entityType }, entity_id: { $eq: id } }).sort({ createdAt: 1 }).limit(500).toArray();
    return {
      id, kind: kindRaw,
      history: events
        .filter((e: any) => STATUS_EVENT.test(String(e.type)))
        .map((e: any) => ({
          at: e.createdAt,
          event: e.type,
          from: e.meta?.from_domain ?? e.before?.state ?? null,
          to: e.meta?.to_domain ?? e.after?.state ?? null,
          by: this.by(e, user.id, iAmPatient),
          reason: typeof e.reason_code === 'string' ? e.reason_code.slice(0, 200) : null,
        })),
    };
  }

  /** Who did a step, from the viewer's side: they did it, the other party did, the platform (admin) did, or the system did. */
  private by(e: any, me: string, iAmPatient: boolean): 'you' | 'patient' | 'provider' | 'platform' | 'system' {
    if (e.actor_account_id && e.actor_account_id === me) return 'you';
    if (!e.actor_account_id || e.actor_role === 'system') return 'system';
    if (e.actor_role === 'admin' || e.actor_role === 'super_admin') return 'platform';
    return iAmPatient ? 'provider' : 'patient';
  }
}
