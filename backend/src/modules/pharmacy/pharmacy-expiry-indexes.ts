import { mongo } from 'mongoose';

type Db = mongo.Db;

/**
 * The indexes of migration 20260827 (`backend/scripts/migrations/20260827-pharmacy-expiry-indexes.js`), as data, so an ops task can create them safely from the compiled backend (the production
 * image holds `dist/` only): the two UNIQUE ones that the pharmacy code relies on (an insert that hits E11000 means "already done", pharmacy-broadcast / expiry-command services) and the two
 * due-scan indexes. Run 96u (2026-11-17): all four were MISSING on the server.
 */
export interface IndexSpec { collection: string; name: string; keys: Record<string, 1 | -1>; unique: boolean }
export const PHARMACY_EXPIRY_INDEXES: IndexSpec[] = [
  { collection: 'domain_outbox', name: 'domain_outbox_pharmacy_idempotency_unique', keys: { aggregate_type: 1, aggregate_id: 1, event_type: 1, idempotency_key: 1 }, unique: true },
  { collection: 'pharmacy_broadcast_recipients', name: 'pharmacy_broadcast_recipient_unique', keys: { broadcast_id: 1, pharmacy_account_id: 1 }, unique: true },
  { collection: 'pharmacy_offers', name: 'pharmacy_offers_due_expiry_scan', keys: { status: 1, quote_expires_at: 1, id: 1 }, unique: false },
  { collection: 'pharmacy_broadcasts', name: 'pharmacy_broadcasts_due_expiry_scan', keys: { lock_state: 1, round_expires_at: 1, id: 1 }, unique: false },
];

export interface IndexPlanRow { collection: string; name: string; unique: boolean; present: boolean; rows: number; duplicate_groups: number | null }

/** Counts only: per index, whether it exists, how many rows the collection has, and (unique ones) how many key groups hold more than one row: those must be resolved before the index can be built. */
export async function planPharmacyIndexes(db: Db, specs: IndexSpec[] = PHARMACY_EXPIRY_INDEXES): Promise<IndexPlanRow[]> {
  const out: IndexPlanRow[] = [];
  for (const s of specs) {
    const col = db.collection(s.collection);
    const existing = await col.indexes().catch(() => [] as any[]);
    const present = existing.some((i: any) => i.name === s.name);
    const rows = await col.estimatedDocumentCount().catch(() => 0);
    let duplicate_groups: number | null = null;
    if (s.unique && !present) {
      const id = Object.fromEntries(Object.keys(s.keys).map((k) => [k, `$${k}`]));
      const r = await col.aggregate([{ $group: { _id: id, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $count: 'groups' }], { allowDiskUse: true, maxTimeMS: 120_000 }).toArray();
      duplicate_groups = r[0]?.groups ?? 0;
    }
    out.push({ collection: s.collection, name: s.name, unique: s.unique, present, rows, duplicate_groups });
  }
  return out;
}

export interface IndexApplyRow { name: string; outcome: 'created' | 'already_present' | 'refused_duplicates' | 'failed' }

/** Create the missing indexes whose pre-flight is clean. Never changes a row; an index whose pre-flight found duplicates is refused (counts reported, finance/ops resolve them first). */
export async function applyPharmacyIndexes(db: Db, specs: IndexSpec[] = PHARMACY_EXPIRY_INDEXES): Promise<IndexApplyRow[]> {
  const plan = await planPharmacyIndexes(db, specs);
  const out: IndexApplyRow[] = [];
  for (const s of specs) {
    const p = plan.find((x) => x.name === s.name)!;
    if (p.present) { out.push({ name: s.name, outcome: 'already_present' }); continue; }
    if (s.unique && (p.duplicate_groups ?? 0) > 0) { out.push({ name: s.name, outcome: 'refused_duplicates' }); continue; }
    try { await db.collection(s.collection).createIndex(s.keys, { name: s.name, unique: s.unique }); out.push({ name: s.name, outcome: 'created' }); }
    catch { out.push({ name: s.name, outcome: 'failed' }); }
  }
  return out;
}
