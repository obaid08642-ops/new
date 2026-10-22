/**
 * Phase 23.5 — retention by type.
 *
 * The plan is explicit that the periods come from the owner and the lawyer, not
 * from me, so the defaults here are conservative and every one is overridable
 * by env. A record under legal hold is never deleted, whatever its age: a hold
 * outranks a schedule.
 *
 * The Verify the plan asks for is "a job test with a short test period; a legal
 * hold blocks deletion", so both are tested directly.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { AUDIT_COLLECTION } from '../../schemas/audit-log.schema';
import { Connection, Types } from 'mongoose';

export interface RetentionPolicy {
  /** Days before a row of this kind is deleted. */
  days: number;
  /** Whether the row is deleted or anonymised in place. */
  action: 'delete' | 'anonymize';
}

const DAY = 24 * 60 * 60;

/**
 * Defaults, chosen to be long rather than aggressive, because deleting a legal
 * record early is the expensive mistake and keeping one a while longer is not.
 */
export const DEFAULT_RETENTION: Record<string, RetentionPolicy> = {
  // ZATCA requires e-invoices and tax records for 6 years.
  'tax_record': { days: 2190, action: 'delete' },
  'invoice': { days: 2190, action: 'delete' },
  // MOH medical records: 5 years is the common minimum.
  'medical_record': { days: 1825, action: 'delete' },
  'prescription': { days: 1825, action: 'delete' },
  // Authentication and security logs: 1 year.
  'security_log': { days: 365, action: 'delete' },
  'login_failed': { days: 365, action: 'delete' },
  // Everything else: PDPL "no longer than necessary".
  'default': { days: 1095, action: 'anonymize' },
};

@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(@InjectConnection() private readonly conn: Connection) {}

  /** The policy for a row, from env overrides then the defaults above. */
  policyFor(kind: string): RetentionPolicy {
    // Per-kind first, then the blanket override. The order matters: a test (or
    // an owner decision) that sets only RETENTION_DAYS_SECURITY_LOG must win
    // over the generic RETENTION_DAYS, and both must beat the default.
    const specific = Number(process.env[`RETENTION_DAYS_${kind.toUpperCase()}`]);
    const generic = Number(process.env.RETENTION_DAYS);
    for (const days of [specific, generic]) {
      // A nonsensical value is ignored rather than clamped, so a typo cannot
      // turn into "delete everything now".
      if (Number.isFinite(days) && days > 0) {
        return { days, action: DEFAULT_RETENTION[kind]?.action ?? 'anonymize' };
      }
    }
    return DEFAULT_RETENTION[kind] ?? DEFAULT_RETENTION.default;
  }

  /**
   * Apply the schedule.
   *
   * Returns what it did so the caller can log it — a retention job that cannot
   * say what it removed is the kind of thing that is impossible to audit later.
   */
  async apply(options: { now?: Date } = {}) {
    const now = options.now ?? new Date();
    const holds = await this.heldKeys();
    const summary: Record<string, { deleted: number; anonymized: number; held: number }> = {};

    for (const kind of Object.keys(DEFAULT_RETENTION)) {
      if (kind === 'default') continue;
      const policy = this.policyFor(kind);
      const cutoff = new Date(now.getTime() - policy.days * DAY);
      const filter = { resource_kind: kind, createdAt: { $lt: cutoff } } as any;

      // A held row is excluded from the delete set rather than deleted and
      // reinserted, so a hold can never be lost to a partial run.
      const candidates = await this.conn.collection(AUDIT_COLLECTION).find(filter).project({ _id: 1, user_id: 1, resource_id: 1, sequence: 1, hash: 1, prev_hash: 1 }).toArray();
      const blocked = candidates.filter((r: any) => this.isHeld(holds, r));
      const deletable = candidates.filter((r: any) => !this.isHeld(holds, r));

      // Each deleted row leaves a tombstone with only its chain links (no content, no personal
      // data), written first, so AuditService.verifyChain still sees an unbroken chain after a
      // lawful deletion and only real tampering is reported.
      const chained = deletable.filter((r: any) => r.sequence !== undefined && r.sequence !== null);
      if (chained.length) {
        await this.conn.collection('audit_tombstones').bulkWrite(chained.map((r: any) => ({
          updateOne: {
            filter: { sequence: r.sequence },
            update: { $setOnInsert: { sequence: r.sequence, hash: r.hash ?? null, prev_hash: r.prev_hash ?? null, kind, deleted_at: now } },
            upsert: true,
          },
        })), { ordered: false });
      }
      const deleted = deletable.length
        ? (await this.conn.collection(AUDIT_COLLECTION).deleteMany({ _id: { $in: deletable.map((r: any) => r._id) } })).deletedCount
        : 0;
      // Only 'delete' policies are applied by kind here; the 'default' (anonymise) policy has no
      // owner-approved period yet, so it is not run (nothing is anonymised silently).
      const anonymized = 0;

      summary[kind] = { deleted, anonymized, held: blocked.length };
      if (deleted || blocked.length) {
        this.logger.log(`retention ${kind}: ${deleted} deleted, ${blocked.length} held, policy ${policy.days}d`);
      }
    }
    return { ran_at: now.toISOString(), summary };
  }

  /** 23.5 — a legal hold pauses deletion for one record. */
  async placeHold(subject: { user_id?: string; resource_id?: string; reason: string; until?: string }, actor?: { id?: string; role?: string }) {
    await this.conn.collection('audit_legal_holds').insertOne({
      ...subject,
      reason: subject.reason,
      placed_at: new Date(),
      until: subject.until ? new Date(subject.until) : null,
      placed_by: actor?.id ?? 'system',
      role: actor?.role ?? 'system',
    });
    return { held: true, subject };
  }

  async releaseHold(id: string) {
    // The _id is an ObjectId; deleting with the string form matches nothing and
    // the hold would silently survive.
    const oid = new Types.ObjectId(String(id));
    const r = await this.conn.collection('audit_legal_holds').deleteOne({ _id: oid });
    return { released: r.deletedCount };
  }

  async listHolds(): Promise<any[]> {
    return this.conn.collection('audit_legal_holds').find({}).sort({ placed_at: -1 }).limit(500).toArray();
  }

  private async heldKeys(): Promise<any[]> {
    return this.conn.collection('audit_legal_holds').find({}).toArray();
  }

  private isHeld(holds: any[], row: any): boolean {
    const now = Date.now();
    return holds.some((h) => {
      if (h.until && new Date(h.until).getTime() < now) return false; // expired
      if (h.user_id && h.user_id === row.user_id) return true;
      if (h.resource_id && h.resource_id === row.resource_id) return true;
      return false;
    });
  }
}