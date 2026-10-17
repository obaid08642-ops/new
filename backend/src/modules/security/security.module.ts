import { Module, Injectable, Controller, Get, Post, Delete, Body, Param, NestMiddleware, MiddlewareConsumer, UseGuards, Query, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditRetentionService } from './audit-retention.service';
import { escapeRegex } from '../../common/slug.util';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLog, AuditLogSchema } from '../../schemas/audit-log.schema';
import { JwtAuthGuard, CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Request, Response, NextFunction } from 'express';
import { randomUUID, createHash } from 'crypto';
import { logEvent, runWithLogContext } from '../../common/structured-logger';

/** 23.1 — the full field set the plan requires of every event. */
export interface AuditEntry {
  action: string;
  /* who */
  user_id?: string;
  role?: string;
  impersonator_id?: string;
  /* what */
  resource_kind?: string;
  resource_id?: string;
  details?: any;
  changes?: { before?: Record<string, any>; after?: Record<string, any> };
  /* where */
  ip?: string;
  device_id?: string;
  user_agent?: string;
  platform?: string;
  app_version?: string;
  /* why — required for admin and financial actions */
  reason?: string;
  severity?: 'info' | 'warn' | 'critical';
  correlation_id?: string;
}

/**
 * JSON with object keys sorted, so that hashing the same logical event twice
 * produces the same string. Without this, `{a:1,b:2}` and `{b:2,a:1}` would
 * hash differently and a chain would look tampered with when nothing changed.
 */
function stableStringify(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

@Injectable()
export class AuditService {
  constructor(@InjectModel('AuditLog') private logs: Model<any>) {}
  /**
   * Append one event, chained to the previous one (23.3).
   *
   * The hash covers the canonical JSON of the event plus the previous row's
   * hash, so an edit or a deletion anywhere makes every later row mismatch.
   * `sequence` is allocated with findOneAndUpdate + $inc, which is atomic, so
   * two concurrent writers cannot claim the same slot.
   *
   * A failure here must never break the action the user asked for, so it is
   * swallowed — but it is logged, because a trail that silently stops is worse
   * than no trail.
   */
  /** Writers in this process take turns (see write()); the tail of that queue. */
  private writeQueue: Promise<void> = Promise.resolve();

  async write(entry: AuditEntry): Promise<void> {
    // Writers in one process take turns instead of racing for the chain head: with N concurrent writers each
    // compare-and-set round has one winner, so the last one needed N rounds and an event was dropped once N passed
    // the retry cap (CI: 25 writers, 24 rows). The compare-and-set below still handles other processes and nodes.
    const turn = this.writeQueue.then(() => this.writeChained(entry));
    this.writeQueue = turn.catch(() => undefined);
    return turn;
  }

  private async writeChained(entry: AuditEntry) {
    try {
      // The chain head (last sequence + its hash) lives in one counter document and is advanced
      // with a compare-and-set, so two concurrent writers can never both link to the same
      // predecessor (reading "the latest row" instead let them, and the chain then looked
      // tampered with when nothing was). A lost race simply retries on the new head.
      const heads = (this.logs as any).db.collection('audit_sequence');
      for (let attempt = 0; attempt < 100; attempt++) {
        // another process won the head: back off a little (jittered, growing) before reading it again
        if (attempt) await new Promise((r) => setTimeout(r, Math.min(50, attempt * 2) * Math.random()));
        const head: any = (await heads.findOne({ _id: 'global' })) || { value: 0, head_hash: null };
        const sequence = Number(head.value || 0) + 1;
        const prev_hash = (head.head_hash as string) || null;
        const row = {
          ...entry,
          // The hash covers what is stored, so the schema default is applied here too.
          severity: entry.severity ?? 'info',
          sequence,
          prev_hash,
        };
        const hash = this.hashRow(row);
        const claimed = await heads.updateOne(
          { _id: 'global', value: head.value ?? 0 },
          { $set: { value: sequence, head_hash: hash } },
          { upsert: !head._id },
        ).catch((e: any) => (e?.code === 11000 ? { matchedCount: 0, upsertedCount: 0 } : Promise.reject(e)));
        if (!claimed.matchedCount && !claimed.upsertedCount) continue;
        await this.logs.create({ ...row, hash });
        return;
      }
      throw new Error('audit_chain_contention');
    } catch (e: any) {
      // A failure here must never break the user's action, but a trail that silently stops is
      // worse than none: say so.
      // eslint-disable-next-line no-console
      logEvent('error', 'audit_record_failed', { action: entry?.action, error: e?.message }, 'security');
    }
  }

  /**
   * The canonical hash of one event: a stable JSON form of the fields plus the
   * previous hash. Key order must not matter, so the object is sorted.
   */
  private hashRow(row: Record<string, any>): string {
    const canonical = Object.keys(row)
      .filter((k) => k !== 'hash' && row[k] !== undefined)
      .sort()
      .map((k) => `${k}=${stableStringify(row[k])}`)
      .join('|');
    return createHash('sha256').update(`${canonical}|prev=${row.prev_hash ?? ''}`).digest('hex');
  }

  /**
   * 23.3 Verify — walk the chain and report the first break.
   *
   * Returns where it broke rather than a bare boolean, because "the audit log
   * was tampered with" is not actionable and "row 412 does not match its
   * predecessor" is.
   */
  async verifyChain(options: { limit?: number } = {}) {
    const limit = Math.min(options.limit ?? 5000, 50_000);
    const rows: any[] = await this.logs.find({}).sort({ sequence: 1 }).limit(limit).lean<any[]>();
    // Rows removed by the retention schedule leave a tombstone (sequence, hash, prev_hash, no
    // content), so a lawful deletion keeps the links intact and is not reported as tampering.
    const last = rows[rows.length - 1]?.sequence ?? 0;
    const tombs: any[] = rows.length
      ? await (this.logs as any).db.collection('audit_tombstones').find({ sequence: { $lte: last } }).sort({ sequence: 1 }).toArray()
      : [];
    const bySeq = new Map<number, any>();
    for (const t of tombs) bySeq.set(Number(t.sequence), { ...t, tombstone: true });
    for (const r of rows) bySeq.set(Number(r.sequence), r);
    const chain = [...bySeq.values()].filter((r) => r.sequence !== undefined).sort((x, y) => x.sequence - y.sequence);
    let prev: string | null = chain.length && chain[0].sequence > 1 ? (chain[0].prev_hash ?? null) : null;
    let checked = 0;
    for (const row of chain) {
      // A deleted row without a tombstone shows up here: the next row's prev_hash no longer matches.
      if ((row.prev_hash ?? null) !== prev) {
        return { ok: false, broken_at: row.sequence ?? null, reason: 'prev_hash_mismatch', checked };
      }
      if (!row.tombstone) {
        const expected = this.hashRow({
          action: row.action, user_id: row.user_id, role: row.role, impersonator_id: row.impersonator_id,
          resource_kind: row.resource_kind, resource_id: row.resource_id, details: row.details, changes: row.changes,
          ip: row.ip, device_id: row.device_id, user_agent: row.user_agent, platform: row.platform,
          app_version: row.app_version, reason: row.reason, severity: row.severity, correlation_id: row.correlation_id,
          sequence: row.sequence, prev_hash: row.prev_hash,
        });
        if (row.hash !== expected) return { ok: false, broken_at: row.sequence ?? null, reason: 'hash_mismatch', checked };
      }
      prev = row.hash ?? null;
      checked += 1;
    }
    // Deleting the newest rows leaves no successor to mismatch, so compare the end of the chain
    // with the head the writer recorded (only when the whole chain was read).
    if (rows.length < limit && chain.length) {
      const head: any = await (this.logs as any).db.collection('audit_sequence').findOne({ _id: 'global' });
      if (head?.head_hash && head.head_hash !== prev) {
        return { ok: false, broken_at: Number(head.value) || null, reason: 'tail_missing', checked };
      }
    }
    return { ok: true, checked, broken_at: null, reason: null };
  }
  async query(filter: any = {}, limit = 100) { return this.logs.find(filter).sort({ createdAt: -1 }).limit(Math.min(limit, 500)).lean(); }

  async queryAdmin(options: { search?: string; role?: string; severity?: string; user_id?: string; page?: number; limit?: number }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(options.limit || 50, 500));
    const filter: any = {};
    if (options.role) filter.role = options.role;
    if (options.severity) filter.severity = options.severity;
    if (options.user_id) filter.user_id = options.user_id;
    if (options.search) {
      filter.$or = [
        { action: { $regex: escapeRegex(String(options.search)), $options: 'i' } },
        { resource_kind: { $regex: escapeRegex(String(options.search)), $options: 'i' } },
        { resource_id: { $regex: escapeRegex(String(options.search)), $options: 'i' } },
      ];
    }
    const total = await this.logs.countDocuments(filter);
    const logs = await this.logs.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { logs, total, page, limit };
  }

  /**
   * 23.4 — a timeline for one subject: a user, an order, a booking, a provider.
   * Events are ordered oldest-first, because a timeline is read as a story.
   */
  async timeline(subject: { user_id?: string; resource_kind?: string; resource_id?: string }, limit = 200) {
    const filter: Record<string, { $eq: string }> = {};
    // $eq rather than a bare value, and a strict shape check, so a caller can
    // never smuggle a query operator (`$ne`, `$regex`) through these fields:
    // they are compared for equality against one literal key each.
    for (const key of ['user_id', 'resource_kind', 'resource_id'] as const) {
      const value = subject[key];
      if (value === undefined || value === null || value === '') continue;
      const asString = String(value);
      if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(asString)) {
        throw new BadRequestException(`audit_timeline_bad_${key}`);
      }
      filter[key] = { $eq: asString };
    }
    if (Object.keys(filter).length === 0) throw new BadRequestException('audit_timeline_needs_a_subject');
    return this.logs.find(filter).sort({ sequence: 1 }).limit(Math.min(limit, 500)).lean();
  }

  /**
   * 23.4 — CSV export for a legal request. The export must match the stored
   * events exactly, so the rows come from the same query the timeline uses and
   * nothing is reformatted on the way out.
   */
  async exportCsv(subject: { user_id?: string; resource_kind?: string; resource_id?: string }, limit = 10_000) {
    const rows = await this.timeline(subject, limit);
    const header = [
      'sequence', 'createdAt', 'action', 'role', 'user_id', 'impersonator_id',
      'resource_kind', 'resource_id', 'severity', 'ip', 'device_id', 'platform',
      'app_version', 'reason', 'correlation_id', 'details', 'hash',
    ];
    const escape = (v: any): string => {
      if (v === null || v === undefined) return '';
      const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
      // A leading =, +, - or @ is executed by a spreadsheet: prefix it.
      const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const body = rows.map((r: any) => header.map((h) => escape(r[h])).join(','));
    return [header.join(','), ...body].join('\n');
  }

  /**
   * 23.4 — PII is masked for anyone who is not the owner. Super admins see
   * full detail; named roles and the subject themselves see the rest masked.
   * Masking happens on read, so the stored event is never altered.
   */
  maskFor(events: any[], viewer: { id?: string; role?: string }) {
    const full = viewer?.role === UserRole.SUPER_ADMIN || viewer?.id === events[0]?.user_id;
    if (full) return events;
    return events.map((e) => ({
      ...e,
      user_id: maskId(e.user_id),
      device_id: e.device_id ? maskId(e.device_id) : e.device_id,
      ip: e.ip ? maskIp(e.ip) : e.ip,
      user_agent: e.user_agent ? '[redacted]' : e.user_agent,
      details: e.details ? maskObject(e.details) : e.details,
    }));
  }

  /** 23.1 — patient login/device history, which `last_login_at` alone cannot give. */
  async loginHistory(userId: string, limit = 100) {
    return this.logs
      .find({ user_id: userId, action: { $in: ['patient_login', 'patient_register', 'patient_logout', 'login_failed', 'admin_login', 'provider_login'] } })
      .sort({ sequence: -1 })
      .limit(Math.min(limit, 500))
      .lean();
  }

  /** 23.1 — a role that touches money or configuration must say why. */
  static readonly REASONS_REQUIRED = new Set(['admin_refund', 'user_modify', 'commission_change', 'admin_force_cancel', 'config_change']);

  async queryPersonal(userId: string, options: { page?: number; limit?: number }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(options.limit || 20, 100));
    const filter = { user_id: userId };
    const total = await this.logs.countDocuments(filter);
    const logs = await this.logs.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { logs, total, page, limit };
  }

  // ── Event-driven Audit Capture ──────────────────────────────

  // Patient Actions
  @OnEvent('auth.register') async onRegister(p: any) { await this.write({ action: 'patient_register', user_id: p.user_id, role: p.role || 'patient', ip: p.ip, user_agent: p.user_agent, details: p.details }); }
  @OnEvent('auth.login') async onLogin(p: any) { await this.write({ action: 'patient_login', user_id: p.user_id, role: p.role || 'patient', ip: p.ip, user_agent: p.user_agent, details: p.details }); }
  @OnEvent('auth.logout') async onLogout(p: any) { await this.write({ action: 'patient_logout', user_id: p.user_id, role: p.role || 'patient', ip: p.ip, user_agent: p.user_agent }); }
  @OnEvent('booking.created') async onBookingCreated(p: any) { await this.write({ action: 'consultation_booking', user_id: p.patient_id, role: 'patient', resource_kind: 'booking', resource_id: p.id, details: { booking_id: p.id } }); }
  @OnEvent('booking.cancelled') async onBookingCancelled(p: any) { await this.write({ action: 'consultation_cancellation', user_id: p.actor_id, role: p.role, resource_kind: 'booking', resource_id: p.id }); }
  @OnEvent('payment.completed') async onPaymentCompleted(p: any) { await this.write({ action: 'payment_completed', user_id: p.patient_id, role: 'patient', resource_kind: 'transaction', resource_id: p.transaction_id, details: { amount: p.amount } }); }
  @OnEvent('upload.completed') async onUploadCompleted(p: any) { await this.write({ action: 'file_upload', user_id: p.user_id, role: p.role, resource_kind: 'media', resource_id: p.id, details: { mime: p.mime, size: p.size } }); }
  @OnEvent('upload.rejected') async onUploadRejected(p: any) { await this.write({ action: 'upload_rejected', user_id: p.user_id, ip: p.ip, details: { reason: p.reason, mime: p.mime, size: p.size }, severity: 'warn' }); }

  // Provider Actions
  @OnEvent('provider.schedule_updated') async onScheduleUpdated(p: any) { await this.write({ action: 'schedule_change', user_id: p.provider_id, role: 'provider' }); }
  @OnEvent('call.accepted') async onCallAccepted(p: any) { await this.write({ action: 'consultation_accept', user_id: p.callee_id, role: 'doctor', resource_kind: 'call', resource_id: p.session_id }); }
  @OnEvent('call.rejected') async onCallRejected(p: any) { await this.write({ action: 'consultation_reject', user_id: p.callee_id, role: 'doctor', resource_kind: 'call', resource_id: p.session_id }); }
  @OnEvent('prescription.created') async onPrescriptionCreated(p: any) { await this.write({ action: 'prescription_create', user_id: p.doctor_id, role: 'doctor', resource_kind: 'prescription', resource_id: p.id }); }
  @OnEvent('prescription.updated') async onPrescriptionUpdated(p: any) { await this.write({ action: 'prescription_edit', user_id: p.doctor_id, role: 'doctor', resource_kind: 'prescription', resource_id: p.id }); }
  @OnEvent('provider.profile_updated') async onProviderProfileUpdated(p: any) { await this.write({ action: 'profile_edit', user_id: p.provider_id, role: 'provider' }); }

  // Admin Actions
  @OnEvent('admin.user_updated') async onAdminUserUpdated(p: any) { await this.write({ action: 'user_modify', user_id: p.admin_id, role: 'admin', resource_kind: 'user', resource_id: p.target_user_id, severity: 'warn' }); }
  @OnEvent('admin.provider_approved') async onAdminProviderApproved(p: any) { await this.write({ action: 'provider_approve', user_id: p.admin_id, role: 'admin', resource_kind: 'provider', resource_id: p.provider_id, severity: 'warn' }); }
  @OnEvent('admin.provider_rejected') async onAdminProviderRejected(p: any) { await this.write({ action: 'provider_reject', user_id: p.admin_id, role: 'admin', resource_kind: 'provider', resource_id: p.provider_id, severity: 'warn' }); }
  @OnEvent('admin.commission_updated') async onAdminCommissionUpdated(p: any) { await this.write({ action: 'commission_change', user_id: p.admin_id, role: 'admin', details: { rate: p.rate }, severity: 'warn' }); }
  @OnEvent('feature_flag.updated') async onFeatureFlagUpdated(p: any) { await this.write({ action: 'flag_change', user_id: p.admin_id, role: 'admin', details: { flag: p.flag, value: p.value } }); }
  @OnEvent('auth.login_failed') async onLoginFailed(p: any) { await this.write({ action: 'login_failed', ip: p.ip, user_agent: p.user_agent, details: { phone: hashTail(p.phone) }, severity: 'warn' }); }
  @OnEvent('payment.refund') async onRefund(p: any) { await this.write({ action: 'payment_refund', user_id: p.actor_id, resource_kind: 'transaction', resource_id: p.transaction_id, details: { amount: p.amount }, severity: 'warn' }); }
  @OnEvent('admin.force_cancel') async onForceCancel(p: any) { await this.write({ action: 'admin_force_cancel', user_id: p.actor_id, role: 'admin', resource_kind: p.kind, resource_id: p.id, severity: 'critical' }); }

  // ============ EPIC5/S5: financial + medical sensitive actions ============
  /** Manual finance approvals (payouts, refund executions) — maker-checker decisions */
  @OnEvent('finance.operation.executed') async onFinanceOpExecuted(p: any) { await this.write({ action: 'finance_operation_executed', user_id: p.by, role: 'admin', resource_kind: 'finance_operation', resource_id: p.id, details: { type: p.type, amount: p?.payload?.amount, provider_account_id: p?.payload?.provider_account_id }, severity: 'critical' }); }
  @OnEvent('finance.operation.rejected') async onFinanceOpRejected(p: any) { await this.write({ action: 'finance_operation_rejected', user_id: p.by, role: 'admin', resource_kind: 'finance_operation', resource_id: p.id, details: { type: p.type, note: p.note }, severity: 'warn' }); }
  /** Insurance decisions (approval / rejection / copay) */
  @OnEvent('insurance.decided') async onInsuranceDecided(p: any) { await this.write({ action: 'insurance_decision', resource_kind: 'insurance_request', resource_id: p.request_id, details: { state: p.state, copay_amount: p.copay_amount, patient_id: p.patient_id }, severity: 'warn' }); }
  /** Medical reports created (lab/radiology/doctor reports) */
  @OnEvent('medical_report.created') async onMedicalReportCreated(p: any) { await this.write({ action: 'medical_report_created', resource_kind: 'medical_report', resource_id: p.id, details: { patient_id: p.patient_id, critical: !!p.critical, tracking_id: p.tracking_id }, severity: p.critical ? 'critical' : 'info' }); }
  /** Lab / radiology report uploads */
  @OnEvent('lab.report_uploaded') async onLabReportUploaded(p: any) { await this.write({ action: 'lab_report_uploaded', resource_kind: 'lab_booking', resource_id: p.booking_id, details: { report_id: p.report_id, patient_id: p.patient_id }, severity: 'warn' }); }
  @OnEvent('radiology.report_published') async onRadiologyReportPublished(p: any) { await this.write({ action: 'radiology_report_published', resource_kind: 'radiology_booking', resource_id: p.bookingId || p.booking_id, details: { patient_id: p.patientId || p.patient_id }, severity: 'warn' }); }
  /** Irreversible user deletion by admin */
  @OnEvent('admin.user_deleted') async onUserDeleted(p: any) { await this.write({ action: 'user_deleted', user_id: p.admin_id, role: 'admin', resource_kind: 'user', resource_id: p.target_user_id, details: { target_role: p.role, phone_tail: p.phone_tail }, severity: 'critical' }); }
}
/** 23.4 — keep the shape, drop the digits that identify a person. */
function maskId(v?: string) { if (!v) return v; return v.length <= 4 ? '***' : `${v.slice(0, 2)}***${v.slice(-2)}`; }
function maskIp(v?: string) { if (!v) return v; const p = v.split('.'); return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : 'masked'; }
function maskObject(o: any): any {
  if (Array.isArray(o)) return o.map(maskObject);
  if (o && typeof o === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = /phone|email|national_id|id_number|password|token/i.test(k) ? '[redacted]' : maskObject(v);
    }
    return out;
  }
  return o;
}

function hashTail(s?: string) { if (!s) return null; return createHash('sha256').update(s).digest('hex').slice(0, 12); }

/** Tracing + Correlation-ID + slow-request middleware. */
@Injectable()
export class TracingMiddleware implements NestMiddleware {
  use(req: Request & { correlation_id?: string }, res: Response, next: NextFunction) {
    const id = (req.headers['x-correlation-id'] as string) || randomUUID();
    req.correlation_id = id;
    res.setHeader('x-correlation-id', id);
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      if (ms > 1500 || res.statusCode >= 500) {
        runWithLogContext({ requestId: id }, () =>
          logEvent(res.statusCode >= 500 ? 'error' : 'warn', 'slow_or_err', { method: req.method, route: String(req.originalUrl || req.url || '').split('?')[0], status: res.statusCode, duration_ms: ms }, 'security'));
      }
    });
    next();
  }
}

/** Minimal helmet-style header hardening WITHOUT adding the helmet dependency. */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
  }
}

@Controller('security/audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private svc: AuditService, private readonly retention: AuditRetentionService) {}

  @Get('admin')
  @Roles(UserRole.ADMIN)
  async admin(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('severity') severity?: string,
    @Query('user_id') userId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.svc.queryAdmin({ search, role, severity, user_id: userId, page: +page, limit: +limit });
  }

  @Get('my-activity')
  async myActivity(
    @CurrentUser() u: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.queryPersonal(u.id, { page: +page, limit: +limit });
  }

  @Get('recent')
  @Roles(UserRole.ADMIN)
  recent() { return this.svc.query({}, 200); }

  /**
   * 23.4 — a timeline per user, order/booking or provider.
   *
   * Reading the trail is itself logged (23.4): an auditor's own access to the
   * audit log is exactly what a later reviewer will ask about.
   */
  @Get('timeline')
  @Roles(UserRole.ADMIN)
  async timeline(
    @CurrentUser() admin: any,
    @Query('user_id') userId?: string,
    @Query('resource_kind') kind?: string,
    @Query('resource_id') resourceId?: string,
  ) {
    const subject = { user_id: userId, resource_kind: kind, resource_id: resourceId };
    const events = await this.svc.timeline(subject);
    await this.svc.write({
      action: 'audit_timeline_read',
      user_id: admin.id,
      role: admin.role,
      severity: 'warn',
      details: { subject, rows: events.length },
    });
    return { subject, events: this.svc.maskFor(events, admin) };
  }

  /** 23.4 — CSV export for a legal request; the rows are the stored events. */
  @Get('export.csv')
  @Roles(UserRole.ADMIN)
  async exportCsv(
    @CurrentUser() admin: any,
    @Query('user_id') userId?: string,
    @Query('resource_kind') kind?: string,
    @Query('resource_id') resourceId?: string,
  ) {
    const subject = { user_id: userId, resource_kind: kind, resource_id: resourceId };
    const csv = await this.svc.exportCsv(subject);
    await this.svc.write({
      action: 'audit_export',
      user_id: admin.id,
      role: admin.role,
      severity: 'critical',
      details: { subject, reason: 'legal_request' },
    });
    return csv;
  }

  /** 23.3 — the tamper-evidence check, so an operator can run it on demand. */
  @Get('verify')
  @Roles(UserRole.ADMIN)
  async verify() {
    const result = await this.svc.verifyChain();
    if (!result.ok) {
      await this.svc.write({
        action: 'audit_chain_broken',
        severity: 'critical',
        details: { broken_at: result.broken_at, reason: result.reason },
      });
    }
    return result;
  }

  @Get('critical')
  @Roles(UserRole.ADMIN)
  critical() { return this.svc.query({ severity: 'critical' }, 100); }

  // 23.5 — legal holds and the retention schedule. Every action is itself in the trail.
  @Get('retention/holds')
  @Roles(UserRole.SUPER_ADMIN)
  holds() { return this.retention.listHolds(); }

  @Post('retention/holds')
  @Roles(UserRole.SUPER_ADMIN)
  async placeHold(@CurrentUser() admin: any, @Body() body: { user_id?: string; resource_id?: string; reason?: string; until?: string }) {
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < 5) throw new BadRequestException('legal_hold_reason_required');
    const user_id = typeof body?.user_id === 'string' && body.user_id ? body.user_id : undefined;
    const resource_id = typeof body?.resource_id === 'string' && body.resource_id ? body.resource_id : undefined;
    if (!user_id && !resource_id) throw new BadRequestException('legal_hold_needs_a_subject');
    const until = typeof body?.until === 'string' && !Number.isNaN(Date.parse(body.until)) ? body.until : undefined;
    const out = await this.retention.placeHold({ user_id, resource_id, reason, until }, admin);
    await this.svc.write({ action: 'audit_legal_hold_placed', user_id: admin.id, role: admin.role, reason, severity: 'critical', details: { subject_user_id: user_id, subject_resource_id: resource_id, until } });
    return out;
  }

  @Delete('retention/holds/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async releaseHold(@CurrentUser() admin: any, @Param('id') id: string) {
    if (!/^[a-f0-9]{24}$/i.test(String(id))) throw new BadRequestException('invalid_hold_id');
    const out = await this.retention.releaseHold(id);
    await this.svc.write({ action: 'audit_legal_hold_released', user_id: admin.id, role: admin.role, severity: 'critical', details: { hold_id: id } });
    return out;
  }

  @Post('retention/run')
  @Roles(UserRole.SUPER_ADMIN)
  async runRetention(@CurrentUser() admin: any) {
    const out = await this.retention.apply();
    await this.svc.write({ action: 'audit_retention_run', user_id: admin.id, role: admin.role, severity: 'warn', details: out.summary });
    return out;
  }
}

/** 23.5 — the retention schedule runs once a day; holds always win over the schedule. */
@Injectable()
export class AuditRetentionJob {
  private readonly logger = new Logger(AuditRetentionJob.name);
  constructor(private readonly retention: AuditRetentionService, private readonly audit: AuditService) {}
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run() {
    if (process.env.AUDIT_RETENTION_ENABLED !== 'true') return; // off until the owner/lawyer confirm the periods
    try {
      const out = await this.retention.apply();
      await this.audit.write({ action: 'audit_retention_run', role: 'system', severity: 'warn', details: out.summary });
    } catch (e: any) {
      this.logger.error(`retention run failed: ${e?.message}`);
    }
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: 'AuditLog', schema: AuditLogSchema }])],
  controllers: [AuditController],
  providers: [AuditService, AuditRetentionService, AuditRetentionJob, TracingMiddleware, SecurityHeadersMiddleware],
  exports: [AuditService, TracingMiddleware, SecurityHeadersMiddleware],
})
export class SecurityModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TracingMiddleware, SecurityHeadersMiddleware).forRoutes('*');
  }
}
