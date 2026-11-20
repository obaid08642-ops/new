import type { mongo } from 'mongoose';
import { CatalogueKind } from './catalogue-registration.schema';

type Db = mongo.Db;

interface Source { kind: CatalogueKind; collection: string; /** field that holds the local code, if the concept has one */ code_field?: string; /** a concept with this field falsy / set is not offered */ inactive: Record<string, unknown> }

/** Where each concept lives today. A concept that is soft-deleted or inactive is registered as `retired`, never dropped. */
export const CATALOGUE_SOURCES: readonly Source[] = [
  { kind: 'medicine', collection: 'medicines', inactive: { deleted_at: { $exists: true, $ne: null } } },
  { kind: 'lab_test', collection: 'lab_services', code_field: 'short_code', inactive: { active: false } },
  { kind: 'radiology_service', collection: 'radiology_services', code_field: 'short_code', inactive: { active: false } },
  { kind: 'nursing_service', collection: 'nursing_services', inactive: { active: false } },
  { kind: 'specialty', collection: 'specialties', code_field: 'code', inactive: { active: false } },
];

export interface RegistrationBackfillRow { kind: CatalogueKind; concepts: number; missing: number }

const idOf = (d: Record<string, unknown>): string => String(d.id ?? d._id);

/** READ-ONLY: per kind, how many concepts exist and how many have no registration in `market` yet. */
export async function planRegistrationBackfill(db: Db, market: string, sources: readonly Source[] = CATALOGUE_SOURCES): Promise<RegistrationBackfillRow[]> {
  const rows: RegistrationBackfillRow[] = [];
  for (const s of sources) {
    const have = new Set((await db.collection('catalogue_registrations').find({ kind: s.kind, market_id: market }, { projection: { concept_id: 1 } }).toArray()).map((r) => String(r.concept_id)));
    let concepts = 0; let missing = 0;
    for await (const d of db.collection(s.collection).find({}, { projection: { _id: 1, id: 1 } })) { concepts++; if (!have.has(idOf(d))) missing++; }
    rows.push({ kind: s.kind, concepts, missing });
  }
  return rows;
}

/**
 * Registers every existing concept in `market` (the launch market, SA). Idempotent: an existing registration is never changed, so a re-run is safe and a
 * later `retire` is not undone. `effective_from` = epoch so SA behaviour is "always offered" exactly as today. Dry run is `planRegistrationBackfill`.
 */
export async function applyRegistrationBackfill(db: Db, market: string, opts: { sources?: readonly Source[]; batch?: number } = {}): Promise<{ written: number }> {
  const batch = opts.batch ?? 500;
  let written = 0;
  for (const s of opts.sources ?? CATALOGUE_SOURCES) {
    const col = db.collection('catalogue_registrations');
    const inactiveIds = new Set<string>();
    for await (const d of db.collection(s.collection).find(s.inactive, { projection: { _id: 1, id: 1 } })) inactiveIds.add(idOf(d));
    let ops: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert: boolean } }> = [];
    const flush = async () => { if (ops.length) { const r = await col.bulkWrite(ops as never); written += r.upsertedCount; ops = []; } };
    const projection: Record<string, 1> = { _id: 1, id: 1, ...(s.code_field ? { [s.code_field]: 1 } : {}) };
    for await (const d of db.collection(s.collection).find({}, { projection })) {
      const id = idOf(d);
      const code = s.code_field && typeof d[s.code_field] === 'string' && (d[s.code_field] as string).trim() ? (d[s.code_field] as string).trim() : null;
      ops.push({ updateOne: { filter: { kind: s.kind, concept_id: id, market_id: market }, update: { $setOnInsert: { kind: s.kind, concept_id: id, market_id: market, local_code: code, status: inactiveIds.has(id) ? 'retired' : 'active', effective_from: new Date(0), created_by: 'backfill' } }, upsert: true } });
      if (ops.length >= batch) await flush();
    }
    await flush();
  }
  return { written };
}
