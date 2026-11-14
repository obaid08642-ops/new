import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { ScheduledOnce } from '../../common/scheduled-once';
import { registerGauge } from '../../common/metrics.service';
import { runInvariants, InvariantResult } from './invariants';
import { auditUniqueIndexes, IndexFinding } from './index-audit';

export const FINDINGS = 'db_integrity_findings';
let openErrors = 0;
registerGauge('nabd_db_integrity_error_findings', 'Open database invariant / unique-index findings of severity error (nightly check).', () => openErrors);
const DAY = 86_400_000;

/** R14: nightly invariant + unique-index check. One run per day across workers (R3 lease); findings kept once per id with a first/last seen time, resolved when they stop showing. */
@Injectable()
export class DbIntegrityService {
  private readonly logger = new Logger('DbIntegrity');
  constructor(@InjectConnection() private readonly conn: Connection) {}
  private get findings() { return this.conn.collection(FINDINGS); }

  @Cron('20 3 * * *')
  @ScheduledOnce({ ttlMs: 10 * 60_000, holdMs: 60_000 })
  async nightly() { return this.run(); }

  async run(now = new Date()) {
    const invariants = await runInvariants(this.conn, now);
    const indexes = await auditUniqueIndexes(this.conn);
    const seen = new Set<string>();
    const upsert = async (id: string, severity: string, description: string, count: number, detail: unknown) => {
      seen.add(id);
      await this.findings.updateOne({ id } as any, { $setOnInsert: { id, first_seen: now }, $set: { severity, description, count, detail, last_seen: now, status: 'open' } }, { upsert: true });
    };
    for (const r of invariants) if (r.count !== 0) await upsert(`invariant:${r.id}`, r.severity, r.description, r.count, r.sample);
    for (const f of indexes) await upsert(`index:${f.collection}:${JSON.stringify(f.key)}`, 'error', f.code, f.duplicate_groups ?? 1, f);
    await this.findings.updateMany({ status: 'open', id: { $nin: [...seen] } } as any, { $set: { status: 'resolved', resolved_at: now } });
    openErrors = await this.findings.countDocuments({ status: 'open', severity: 'error' } as any);
    const bad = invariants.filter((r) => r.count !== 0);
    if (openErrors) this.logger.error(`db integrity: ${openErrors} error finding(s): ${bad.filter((r) => r.severity === 'error').map((r) => `${r.id}=${r.count}`).concat(indexes.map((i) => `${i.code}@${i.collection}`)).join(', ')}`);
    else this.logger.log(`db integrity: no error findings (${bad.length} to review)`);
    return { invariants, indexes, open_errors: openErrors };
  }

  async open(): Promise<Array<Record<string, unknown>>> {
    return (await this.findings.find({ status: 'open' } as any, { projection: { _id: 0 } }).sort({ severity: 1, first_seen: -1 }).limit(200).toArray()) as Array<Record<string, unknown>>;
  }
}
export type { InvariantResult, IndexFinding };
