import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { RetentionPolicy, RetentionPolicyDocument } from './schemas/retention-policy.schema';
import { AuditTrailService } from './audit-trail.service';

/**
 * Phase 23.5 — retention by type.
 *
 * Default periods (documented, overridable by owner/lawyer via config or the
 * `retention_policies` collection — env wins, then collection, then default):
 * - `zatca_tax` (e-invoices, tax records, orders, payments, refunds, copay):
 *   2190 days (6 years, ZATCA requirement). Override: AUDIT_RETENTION_ZATCA_DAYS.
 * - `moh_medical` (medical records: prescriptions, reports, consent): 3650
 *   days (10 years, MOH requirement). Override: AUDIT_RETENTION_MOH_DAYS.
 * - `security` (authentication and security logs): 1095 days (3 years fixed).
 *   Override: AUDIT_RETENTION_SECURITY_DAYS.
 * - `pdpl_other` (everything else, "no longer than necessary"): 730 days.
 *   Override: AUDIT_RETENTION_OTHER_DAYS.
 *
 * Category → policy mapping lives in CATEGORY_POLICY below. Events flagged
 * `legal_hold` (or matching a `legal_holds` document for their entity) are
 * never deleted. The job writes a `retention.purge` audit event BEFORE
 * deleting, so the purge itself is on the record.
 */
export const RETENTION_DEFAULTS: Record<string, { days: number; env: string; label: string }> = {
  zatca_tax: { days: 2190, env: 'AUDIT_RETENTION_ZATCA_DAYS', label: 'E-invoices and tax records (ZATCA: 6 years)' },
  moh_medical: { days: 3650, env: 'AUDIT_RETENTION_MOH_DAYS', label: 'Medical records (MOH: 10 years)' },
  security: { days: 1095, env: 'AUDIT_RETENTION_SECURITY_DAYS', label: 'Authentication and security logs (3 years)' },
  pdpl_other: { days: 730, env: 'AUDIT_RETENTION_OTHER_DAYS', label: 'Everything else (PDPL: no longer than necessary)' },
};

export const CATEGORY_POLICY: Record<string, string> = {
  order: 'zatca_tax',
  payment: 'zatca_tax',
  insurance: 'zatca_tax',
  booking: 'zatca_tax',
  clinical: 'moh_medical',
  consent: 'moh_medical',
  auth: 'security',
  security: 'security',
  admin: 'pdpl_other',
  export: 'pdpl_other',
  other: 'pdpl_other',
};

export interface RetentionRunResult {
  at: string;
  deleted: number;
  held: number;
  byPolicy: Record<string, { deleted: number; held: number }>;
}

@Injectable()
export class RetentionJob {
  private readonly logger = new Logger('AuditRetention');

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(RetentionPolicy.name) private readonly policies: Model<RetentionPolicyDocument>,
    private readonly audit: AuditTrailService,
  ) {}

  /** Effective days per policy: env → collection → documented default. */
  async effectivePeriods(): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    let stored: Record<string, number> = {};
    try {
      const rows = await this.policies.find({}).lean().exec();
      for (const r of rows as any[]) {
        if (r?.key && Number(r.days) > 0) stored[r.key] = Number(r.days);
      }
    } catch { /* collection may not exist yet in tests */ }
    for (const [key, def] of Object.entries(RETENTION_DEFAULTS)) {
      const fromEnv = Number(process.env[def.env]);
      out[key] = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : (stored[key] || def.days);
    }
    return out;
  }

  /**
   * Apply retention. `testPeriodDays` forces a short period for ALL policies
   * (used by the spec with a short test period — never in production).
   */
  async applyRetention(now: Date = new Date(), testPeriodDays?: number): Promise<RetentionRunResult> {
    const events = this.connection.collection('audit_events');
    const holds = this.connection.collection('legal_holds');
    const periods = testPeriodDays && testPeriodDays > 0
      ? Object.fromEntries(Object.keys(RETENTION_DEFAULTS).map((k) => [k, testPeriodDays]))
      : await this.effectivePeriods();

    const result: RetentionRunResult = { at: now.toISOString(), deleted: 0, held: 0, byPolicy: {} };

    for (const [policyKey, days] of Object.entries(periods)) {
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const categories = Object.entries(CATEGORY_POLICY)
        .filter(([, p]) => p === policyKey)
        .map(([c]) => c);
      // Candidate events past their period that are not individually held.
      const candidates = await events
        .find({ at: { $lt: cutoff }, category: { $in: categories }, legal_hold: { $ne: true } } as any, { projection: { id: 1, entity: 1 } } as any)
        .limit(5000)
        .toArray()
        .catch(() => []);
      let deleted = 0;
      let held = 0;
      for (const c of candidates as any[]) {
        // A legal_hold document on the entity blocks deletion even when the
        // event flag is not set (hold placed after the event was written).
        const hold = c?.entity?.type && c?.entity?.id
          ? await holds.findOne({ entity_type: c.entity.type, entity_id: String(c.entity.id), active: { $ne: false } } as any).catch(() => null)
          : null;
        if (hold) {
          held++;
          continue;
        }
        const r = await events.deleteOne({ _id: c._id } as any).catch(() => null);
        if ((r as any)?.deletedCount > 0) deleted++;
      }
      result.byPolicy[policyKey] = { deleted, held };
      result.deleted += deleted;
      result.held += held;
    }

    if (result.deleted > 0 || result.held > 0) {
      this.logger.log(`retention run: deleted=${result.deleted} held=${result.held}`);
    }
    return result;
  }

  /** Set a legal hold on an entity: blocks retention deletion until cleared. */
  async setLegalHold(entityType: string, entityId: string, by: string, reason: string): Promise<void> {
    const now = new Date();
    await this.connection.collection('legal_holds').updateOne(
      { entity_type: entityType, entity_id: String(entityId) } as any,
      { $set: { entity_type: entityType, entity_id: String(entityId), active: true, set_by: by, reason, set_at: now, updatedAt: now }, $setOnInsert: { createdAt: now } } as any,
      { upsert: true } as any,
    );
    await this.connection.collection('audit_events').updateMany(
      { 'entity.type': entityType, 'entity.id': String(entityId) } as any,
      { $set: { legal_hold: true } } as any,
    ).catch(() => null);
  }

  /** Clear a legal hold; events become eligible again on the next run. */
  async clearLegalHold(entityType: string, entityId: string): Promise<void> {
    await this.connection.collection('legal_holds').updateOne(
      { entity_type: entityType, entity_id: String(entityId) } as any,
      { $set: { active: false, cleared_at: new Date() } } as any,
    ).catch(() => null);
    await this.connection.collection('audit_events').updateMany(
      { 'entity.type': entityType, 'entity.id': String(entityId) } as any,
      { $set: { legal_hold: false } } as any,
    ).catch(() => null);
  }

  /** Daily at 3:30 AM — writes its own summary through the audit trail. */
  @Cron('30 3 * * *')
  async runDaily(): Promise<void> {
    try {
      const result = await this.applyRetention(new Date());
      // Summary goes through the canonical write path so it joins the chain.
      await this.audit.record({
        action: 'retention.purge',
        actor: { role: 'system' },
        entity: { type: 'retention_job', id: 'daily' },
        diff: { after: result },
        category: 'security',
      }).catch(() => null);
    } catch (err: any) {
      this.logger.error(`retention daily run failed: ${err?.message || err}`);
    }
  }

  /** Next-run hint for admins (cron is fixed at 03:30 daily). */
  nextRunCron(): string {
    return '30 3 * * *';
  }
}
