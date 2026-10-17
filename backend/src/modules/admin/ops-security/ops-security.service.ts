import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomBytes } from 'crypto';
import { MailService, escapeHtml } from '../../mail/mail.module';
import { FieldEncryptionService } from '../../../common/pdpl-compliance.module';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** D-34: red when the newest successful local or off-server copy is older than this (or missing). */
const BACKUP_STALE_AFTER = 26 * HOUR;
/** D-34: a secret is stale when never rotated or rotated longer ago than this. */
const SECRET_STALE_AFTER = 180 * DAY;

const BACKUP_PAGE_KINDS = ['local', 'offsite', 'restore_test', 'oplog', 'dr_drill'];
/** 20.8: oplog slices run every 10 min; older than this and point-in-time recovery has a hole */
const OPLOG_STALE_AFTER = 30 * 60 * 1000;
/** D-34 rows in security_events (field `at`) expire after this; the page reads 24 h and 7 d. */
const SECURITY_EVENT_TTL_SECONDS = 90 * 24 * 3600;

/** Env names that look like a secret: *SECRET*, *TOKEN*, *PASSWORD*, *PASS, *_KEY, *PRIVATE*, *DSN*. */
function isSecretLike(name: string): boolean {
  const k = String(name || '').toUpperCase();
  if (!k) return false;
  if (k.includes('SECRET') || k.includes('TOKEN') || k.includes('PASSWORD') || k.includes('PRIVATE') || k.includes('DSN')) return true;
  if (k.endsWith('PASS') || k.endsWith('_KEY')) return true;
  return false;
}

const iso = (v: unknown): string | null => {
  if (!v) return null;
  const t = v instanceof Date ? v.getTime() : new Date(String(v)).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

@Injectable()
export class OpsSecurityService implements OnModuleInit {
  private readonly logger = new Logger(OpsSecurityService.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly mail: MailService,
    private readonly crypto: FieldEncryptionService,
  ) {}

  /** Counts stay index-backed, and the rows written on every 429 cannot grow without bound. */
  async onModuleInit() {
    const events = this.conn.collection('security_events');
    await events.createIndex({ type: 1, at: -1 }).catch(() => null);
    await events.createIndex({ type: 1, createdAt: -1 }).catch(() => null);
    // Only rows that carry `at` (the D-34 counters) expire; older event kinds keep their retention.
    await events.createIndex({ at: 1 }, { expireAfterSeconds: SECURITY_EVENT_TTL_SECONDS }).catch(() => null);
  }

  private get coll() {
    return (name: string) => this.conn.collection(name);
  }

  // ── Backups ──────────────────────────────────────────────

  async reportBackupRun(run: { kind: string; ok: boolean; size_bytes?: number; finished_at: string; error?: string; rpo_seconds?: number; rto_seconds?: number }) {
    const doc = {
      kind: run.kind,
      ok: !!run.ok,
      size_bytes: typeof run.size_bytes === 'number' ? run.size_bytes : null,
      rpo_seconds: typeof run.rpo_seconds === 'number' ? run.rpo_seconds : null,
      rto_seconds: typeof run.rto_seconds === 'number' ? run.rto_seconds : null,
      finished_at: new Date(run.finished_at),
      error: run.error ?? null,
      reported_at: new Date(),
    };
    await this.coll('backup_runs').insertOne(doc as any);
    if (!doc.ok) await this.alertOwnerBackupFailed(doc);
    return { ok: true };
  }

  /** D-34: a failed backup alerts the owner by e-mail. Never throws (reporting must not fail). */
  private async alertOwnerBackupFailed(run: { kind: string; error: unknown; finished_at: Date }) {
    try {
      const to = process.env.OWNER_ALERT_EMAIL;
      if (!to) {
        this.logger.warn('backup run failed but OWNER_ALERT_EMAIL is not set');
        return;
      }
      const at = run.finished_at instanceof Date ? run.finished_at.toISOString() : String(run.finished_at);
      const subject = `[Nabd] Backup FAILED: ${run.kind}`;
      const text = `A ${run.kind} backup run reported failure at ${at}. Error: ${String(run.error ?? 'unknown')}`;
      const html = `<p>A <strong>${escapeHtml(run.kind)}</strong> backup run reported failure at ${escapeHtml(at)}.</p><p>Error: ${escapeHtml(String(run.error ?? 'unknown'))}</p>`;
      const r = await this.mail.send(to, subject, html, text);
      if (!r.ok) this.logger.warn(`owner backup alert not delivered: ${r.error}`);
    } catch (e: any) {
      this.logger.warn(`owner backup alert failed: ${e?.message || e}`);
    }
  }

  async backupSection() {
    const rows = await this.coll('backup_runs')
      .find({ kind: { $in: BACKUP_PAGE_KINDS } })
      .sort({ finished_at: -1 })
      .limit(50)
      .toArray()
      .catch(() => []);
    const newest: Record<string, any> = {};
    for (const r of rows as any[]) {
      if (!newest[r.kind]) newest[r.kind] = r;
    }
    const shape = (r: any) =>
      r ? { at: iso(r.finished_at), ok: !!r.ok, size_bytes: typeof r.size_bytes === 'number' ? r.size_bytes : null } : null;
    const fresh = (kind: string, within = BACKUP_STALE_AFTER) => {
      const r = newest[kind];
      const since = Date.now() - within;
      return !!r && !!r.ok && (r.finished_at instanceof Date ? r.finished_at.getTime() : new Date(r.finished_at).getTime()) >= since;
    };
    return {
      local: shape(newest.local),
      offsite: shape(newest.offsite),
      restore_test: shape(newest.restore_test),
      // 20.8: point-in-time recovery. oplog = newest slice run; dr_drill = newest disaster recovery drill with its measured numbers.
      oplog: shape(newest.oplog),
      dr_drill: newest.dr_drill
        ? { ...shape(newest.dr_drill), rpo_seconds: newest.dr_drill.rpo_seconds ?? null, rto_seconds: newest.dr_drill.rto_seconds ?? null }
        : null,
      // Red when the newest successful local OR off-server copy is older than 26 h (or missing),
      // or (once oplog slices have ever been reported) the newest slice is older than 30 min or failed.
      stale: !fresh('local') || !fresh('offsite') || (!!newest.oplog && !fresh('oplog', OPLOG_STALE_AFTER)),
    };
  }

  // ── Security counters ────────────────────────────────────

  async securitySection() {
    const now = Date.now();
    const windows = { last_24h: now - DAY, last_7d: now - 7 * DAY } as const;
    const out: Record<string, Record<string, number>> = {};
    for (const [w, start] of Object.entries(windows)) {
      const [failed, limited, blocked, devices] = await Promise.all([
        this.coll('security_events').countDocuments({ type: 'failed_sign_in', at: { $gte: new Date(start) } }).catch(() => 0),
        // 429s from the throttler guard (`at`) and from the API abuse middleware (`createdAt`).
        this.coll('security_events').countDocuments({ $or: [
          { type: 'rate_limited', at: { $gte: new Date(start) } },
          { type: 'abuse.rate_limited', createdAt: { $gte: new Date(start) } },
        ] }).catch(() => 0),
        this.coll('security_events').countDocuments({ type: 'blocked_request', at: { $gte: new Date(start) } }).catch(() => 0),
        this.coll('admin_devices').countDocuments({ enrolled_at: { $gte: new Date(start) } }).catch(() => 0),
      ]);
      out[w] = {
        failed_sign_ins: failed,
        rate_limited: limited,
        blocked_requests: blocked,
        new_admin_devices: devices,
        step_up_failures: await this.coll('security_events')
          .countDocuments({ type: 'step_up_failure', at: { $gte: new Date(start) } })
          .catch(() => 0),
      };
    }
    return out;
  }

  // ── Secrets (names only — NEVER a value) ─────────────────

  async secretsSection() {
    const names = new Set<string>();
    for (const k of Object.keys(process.env)) {
      if (isSecretLike(k)) names.add(k);
    }
    const recorded = await this.coll('secret_rotations').find({}).toArray().catch(() => []);
    const byName = new Map<string, any>();
    for (const r of recorded as any[]) {
      if (r?.name) {
        names.add(String(r.name));
        byName.set(String(r.name), r);
      }
    }
    const now = Date.now();
    return [...names].sort().map((name) => {
      const r = byName.get(name);
      const last = r?.last_rotated_at ? new Date(r.last_rotated_at).getTime() : NaN;
      return {
        name,
        owner: r?.owner ?? null,
        last_rotated_at: Number.isFinite(last) ? new Date(last).toISOString() : null,
        stale: !Number.isFinite(last) || now - last > SECRET_STALE_AFTER,
      };
    });
  }

  async recordRotation(name: string, owner?: string) {
    const now = new Date();
    await this.coll('secret_rotations').updateOne(
      { name },
      { $set: { name, owner: owner ?? null, last_rotated_at: now, updated_at: now } },
      { upsert: true },
    );
    return { ok: true, name, owner: owner ?? null, last_rotated_at: now.toISOString() };
  }

  // ── PDPL (decision 22) ───────────────────────────────────

  async pdplSection() {
    const [requests, access] = await Promise.all([
      this.coll('gdpr_requests').find({}).sort({ createdAt: -1 }).limit(200).toArray().catch(() => []),
      this.coll('medical_access_logs').find({}).sort({ created_at: -1 }).limit(200).toArray().catch(() => []),
    ]);
    return {
      requests: (requests as any[]).map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        created_at: iso(r.createdAt),
      })),
      record_access: (access as any[]).map((r) => ({
        actor_id: r.actor_id,
        actor_role: r.actor_role,
        record_kind: r.record_kind,
        record_id: this.crypto.decrypt(String(r.record_id ?? '')),
        at: iso(r.created_at),
      })),
    };
  }

  // ── Incidents ────────────────────────────────────────────

  async incidentsSection() {
    const rows = await this.coll('ops_incidents').find({}).sort({ started_at: -1 }).limit(200).toArray().catch(() => []);
    return (rows as any[]).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      started_at: iso(r.started_at),
      note: r.note ?? null,
    }));
  }

  async createIncident(body: { title: string; status: string; note?: string }) {
    const now = new Date();
    const doc = {
      id: randomBytes(8).toString('hex'),
      title: body.title,
      status: body.status,
      note: body.note ?? null,
      started_at: now,
      updated_at: now,
    };
    await this.coll('ops_incidents').insertOne(doc as any);
    return { ...doc, started_at: now.toISOString(), updated_at: now.toISOString() };
  }

  async updateIncident(id: string, status: string) {
    const now = new Date();
    const r = await this.coll('ops_incidents').findOneAndUpdate(
      { id },
      { $set: { status, updated_at: now } },
      { returnDocument: 'after' },
    ).catch(() => null);
    const doc: any = (r as any)?.value ?? (r as any);
    if (!doc?.id) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('incident_not_found');
    }
    return {
      id: doc.id,
      title: doc.title,
      status: doc.status,
      started_at: iso(doc.started_at),
      note: doc.note ?? null,
    };
  }

  // ── Page ─────────────────────────────────────────────────

  async page() {
    const [backups, security, secrets, pdpl, incidents] = await Promise.all([
      this.backupSection(),
      this.securitySection(),
      this.secretsSection(),
      this.pdplSection(),
      this.incidentsSection(),
    ]);
    return { backups, security, secrets, pdpl, incidents };
  }
}
