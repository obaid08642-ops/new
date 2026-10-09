import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { AuditEvent, AuditEventDocument } from './schemas/audit-event.schema';
import { RetentionPolicy, RetentionPolicyDocument } from './schemas/retention-policy.schema';
import { AUDIT_RECORD_EVENT, AuditRecordInput } from './audit-emitter';
import { computeEventHash, verifyEventChain } from './audit-hash';
import { maskAuditEventForViewer } from './pii-mask';

export const AUDIT_QUEUE_NAME = 'audit-trail';

/**
 * Phase 23 — AuditTrailService. The ONLY writer to `audit_events`.
 *
 * - `record()` is the single public write path (queue-based, 23.3): it
 *   enqueues a `persist` job; when the queue is unavailable (Redis down,
 *   unit tests) it falls back to a direct persist so no event is lost.
 * - `@OnEvent('audit.record')` is the fan-in for `emitAudit(...)` (23.2).
 * - Hash chaining happens inside `persistEvent`, the one place that reads
 *   the current tail and inserts — so the chain cannot fork.
 */
@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger('AuditTrail');

  constructor(
    @InjectModel(AuditEvent.name) private readonly events: Model<AuditEventDocument>,
    @InjectModel(RetentionPolicy.name) private readonly policies: Model<RetentionPolicyDocument>,
    @InjectConnection() private readonly connection: Connection,
    @Optional() @InjectQueue(AUDIT_QUEUE_NAME) private readonly queue?: Queue,
  ) {}

  // ── 23.2 fan-in: domain code emits, we persist (never blocks callers) ──
  @OnEvent(AUDIT_RECORD_EVENT)
  async onAuditRecord(input: AuditRecordInput): Promise<void> {
    try {
      await this.record(input);
    } catch (err: any) {
      this.logger.error(`audit.record persist failed: ${err?.message || err}`);
    }
  }

  /**
   * Canonical write path. Queue-based (23.3): a slow log never slows the
   * user. Falls back to direct persist when the queue is unavailable.
   */
  async record(input: AuditRecordInput): Promise<{ id: string } | void> {
    const payload = { ...input, at: input.at || new Date() };
    if (this.queue) {
      try {
        await this.queue.add('persist', payload, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        });
        return;
      } catch (err: any) {
        this.logger.warn(`audit queue unavailable, direct persist: ${err?.message || err}`);
      }
    }
    return this.persistEvent(payload);
  }

  /**
   * The single insert path. Reads the current tail, links `prev_hash`,
   * computes `hash`, inserts. No other code inserts into `audit_events`.
   */
  async persistEvent(input: AuditRecordInput & { at?: Date }): Promise<{ id: string }> {
    const at = input.at || new Date();
    const tail = await this.events.findOne({}, { hash: 1 }).sort({ _id: -1 }).lean().exec().catch(() => null);
    const prevHash: string | null = (tail as any)?.hash ?? null;
    const body = {
      action: input.action,
      actor: input.actor ?? { role: 'system' },
      entity: input.entity,
      diff: input.diff,
      at,
      request_id: input.request_id ?? null,
    };
    const hash = computeEventHash(prevHash, body);
    const doc = await this.events.create({
      id: uuidv4(),
      actor: body.actor,
      action: body.action,
      entity: input.entity,
      diff: input.diff,
      at,
      where: input.where,
      why: input.why,
      request_id: input.request_id,
      prev_hash: prevHash,
      hash,
      category: input.category || 'other',
      legal_hold: false,
      sync_status: 'ok',
    } as any);
    return { id: (doc as any).id };
  }

  // ── 23.3 verification: recompute the chain, report the first break ──
  async verifyChain(opts: { entityType?: string; entityId?: string; limit?: number } = {}): Promise<{
    ok: boolean; checked: number; brokenAt?: number; reason?: string;
  }> {
    const filter: Record<string, any> = {};
    if (opts.entityType) filter['entity.type'] = opts.entityType;
    if (opts.entityId) filter['entity.id'] = opts.entityId;
    const rows = await this.events
      .find(filter, { action: 1, actor: 1, entity: 1, diff: 1, at: 1, request_id: 1, prev_hash: 1, hash: 1 })
      .sort({ _id: 1 })
      .limit(Math.min(opts.limit || 10000, 50000))
      .lean()
      .exec();
    return verifyEventChain(rows as any);
  }

  // ── 23.4 reads (each read writes a `audit.read` event via the caller) ──
  async search(filter: Record<string, any>, limit = 100): Promise<any[]> {
    const rows = await this.events
      .find(filter)
      .sort({ _id: -1 })
      .limit(Math.min(limit, 1000))
      .lean()
      .exec();
    return rows;
  }

  async timeline(entityType: string, entityId: string, limit = 200): Promise<any[]> {
    return this.search({ 'entity.type': entityType, 'entity.id': entityId }, Math.min(limit, 1000));
  }

  masked(rows: any[], viewerRole: unknown): any[] {
    return rows.map((r) => maskAuditEventForViewer(r, viewerRole));
  }

  /** Fire-and-forget read receipt (23.4: reading audit data is itself logged). */
  logRead(viewer: any, what: string, reqMeta?: { ip?: string; user_agent?: string; request_id?: string }): void {
    try {
      void this.record({
        action: 'audit.read',
        actor: { id: viewer?.id, role: String(viewer?.role || 'unknown') },
        entity: { type: 'audit_event', id: what },
        category: 'security',
        where: reqMeta ? { ip: reqMeta.ip, user_agent: reqMeta.user_agent } : undefined,
        request_id: reqMeta?.request_id,
      }).catch((err: any) => this.logger.error(`audit.read persist failed: ${err?.message || err}`));
    } catch (err: any) {
      this.logger.error(`audit.read failed: ${err?.message || err}`);
    }
  }

  toCsv(rows: any[]): string {
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = 'id,at,action,actor_id,actor_role,entity_type,entity_id,request_id,hash,prev_hash';
    const lines = rows.map((r: any) =>
      [
        r.id, r.at instanceof Date ? r.at.toISOString() : r.at, r.action,
        r.actor?.id ?? '', r.actor?.role ?? '', r.entity?.type ?? '', r.entity?.id ?? '',
        r.request_id ?? '', r.hash ?? '', r.prev_hash ?? '',
      ].map(esc).join(','),
    );
    return [header, ...lines].join('\n');
  }

  // ── 23.5 retention support ──
  async getPolicies(): Promise<Record<string, number>> {
    const rows = await this.policies.find({}).lean().exec().catch(() => []);
    const out: Record<string, number> = {};
    for (const r of rows as any[]) out[r.key] = r.days;
    return out;
  }

  /** Direct collection handle for the retention/archive jobs (same module). */
  get collection() {
    return this.connection.collection('audit_events');
  }
}
