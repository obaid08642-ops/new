/**
 * One audit collection (`AUDIT_COLLECTION`).
 *
 * Until now the chained trail (the AuditLog model) lived in `auditlogs` while two raw writers (guest merge/purge, the
 * recordAudit fallback) wrote to `audit_logs`, and the PDPL export and the retention job read and deleted from
 * `audit_logs`. This copies whatever is still in `audit_logs` into the real collection and then sets the old one aside.
 *
 * Safe on a live system, and safe to run on every start:
 *  - the chain itself (`auditlogs`, `audit_sequence`, `audit_tombstones`) is never touched, so `verifyChain` reads the same
 *    rows before and after;
 *  - a copied row keeps its `_id` and is inserted with `$setOnInsert`, so a second run (or two instances starting together)
 *    adds nothing twice;
 *  - copied rows have no `sequence`, so they are not links of the chain (verifyChain ignores rows without one); they get
 *    an `id` (the schema's unique key) and a `createdAt`, so the export, the history and the retention job can use them;
 *  - the old collection is renamed, not dropped, and only after every row is found in the new one.
 */
import { randomBytes } from 'crypto';
import type { Connection } from 'mongoose';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { AUDIT_COLLECTION } from '../../schemas/audit-log.schema';

export const LEGACY_AUDIT_COLLECTION = 'audit_logs';
const BATCH = 500;

export interface AuditMigrationResult { found: number; copied: number; already_there: number; renamed_to: string | null }

export async function migrateLegacyAuditCollection(conn: Pick<Connection, 'collection' | 'db'>, now = new Date()): Promise<AuditMigrationResult> {
  const result: AuditMigrationResult = { found: 0, copied: 0, already_there: 0, renamed_to: null };
  const db: any = (conn as any).db;
  const exists = (await db.listCollections({ name: LEGACY_AUDIT_COLLECTION }, { nameOnly: true }).toArray()).length > 0;
  if (!exists) return result;

  const source = conn.collection(LEGACY_AUDIT_COLLECTION);
  const target = conn.collection(AUDIT_COLLECTION);
  const cursor = source.find({}).sort({ _id: 1 });
  let batch: any[] = [];
  const flush = async () => {
    if (!batch.length) return;
    const res: any = await target.bulkWrite(
      batch.map((d) => ({
        updateOne: {
          filter: { _id: d._id },
          update: { $setOnInsert: { ...withoutId(d), id: d.id ?? `legacy_${String(d._id)}`, createdAt: d.createdAt ?? d.created_at ?? now, legacy_unchained: true } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    result.copied += res.upsertedCount ?? 0;
    result.already_there += res.matchedCount ?? 0;
    batch = [];
  };
  for await (const doc of cursor) {
    result.found += 1;
    batch.push(doc);
    if (batch.length >= BATCH) await flush();
  }
  await flush();

  // every source row must now be in the target before the old collection is set aside
  const missing = await countMissing(source, target);
  if (missing > 0) throw new Error(`audit_collection_migration_incomplete: ${missing} of ${result.found} rows not found`);

  // seconds-resolution stamp plus a random tail: a straggler batch renamed in the same second must not collide
  const stamp = `${now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}_${randomBytes(3).toString('hex')}`;
  const renamed = `${LEGACY_AUDIT_COLLECTION}_migrated_${stamp}`;
  await db.renameCollection(LEGACY_AUDIT_COLLECTION, renamed).catch((e: any) => {
    // another instance renamed it first: nothing left to do
    if (e?.codeName !== 'NamespaceNotFound') throw e;
  });
  result.renamed_to = renamed;
  await conn.collection('schema_migrations').updateOne(
    { name: 'audit-single-collection', renamed_to: renamed },
    { $set: { name: 'audit-single-collection', at: now, ...result } },
    { upsert: true },
  );
  return result;
}

const withoutId = ({ _id, ...rest }: any) => rest; // the filter already carries the _id

async function countMissing(source: any, target: any): Promise<number> {
  let missing = 0;
  let ids: any[] = [];
  const check = async () => {
    if (!ids.length) return;
    const have = await target.countDocuments({ _id: { $in: ids } });
    missing += ids.length - have;
    ids = [];
  };
  for await (const d of source.find({}, { projection: { _id: 1 } })) {
    ids.push(d._id);
    if (ids.length >= 1000) await check();
  }
  await check();
  return missing;
}

/** Runs the migration at start; a failure is logged and never stops the app (the old rows stay where they are). */
@Injectable()
export class AuditCollectionMigration implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuditCollectionMigration.name);
  constructor(@InjectConnection() private readonly conn: Connection) {}
  async onApplicationBootstrap() {
    try {
      const r = await migrateLegacyAuditCollection(this.conn);
      if (r.found) this.logger.log(`audit collection: ${r.copied} rows copied, ${r.already_there} already there, old collection now ${r.renamed_to}`);
    } catch (e: any) {
      this.logger.error(`audit collection migration failed: ${e?.message}`);
    }
  }
}
