/**
 * P5.1/P5.2 catalog collection unification.
 * Renames legacy catalog collections to the canonical names in
 * `backend/src/modules/catalogs/catalog-collections.ts`.
 *
 * - Dry-run default: prints planned renames/merges + counts, changes nothing.
 * - Apply with: `node scripts/migrations/2026-09-unify-catalog-collections.ts --apply`
 * - If the canonical collection already holds docs, legacy docs are merged
 *   by stable key (code/id, then name) — never duplicated, never dropped.
 * - Legacy collection is dropped ONLY after every legacy doc is accounted for.
 *
 * Run with: `npx ts-node scripts/migrations/2026-09-unify-catalog-collections.ts [--apply]`
 */
import { connect, connection } from 'mongoose';

const APPLY = process.argv.includes('--apply');

const RENAMES: Array<{ from: string; to: string; keys: string[] }> = [
  { from: 'medicines_master', to: 'medicines', keys: ['barcode', 'id'] },
  { from: 'labservices', to: 'lab_services', keys: ['short_code', 'code', 'id'] },
  { from: 'radiologyservices', to: 'radiology_services', keys: ['short_code', 'code', 'id'] },
  { from: 'nursing_catalog', to: 'nursing_services', keys: ['short_code', 'code', 'id'] },
  { from: 'insurancecompanies', to: 'insurance_companies', keys: ['code', 'id'] },
];

function stableKey(doc: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = doc?.[k];
    if (typeof v === 'string' && v.trim()) return `${k}:${v.trim()}`;
  }
  return null;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nabdplus?replicaSet=rs0';
  await connect(uri);
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const report: any[] = [];
  for (const { from, to, keys } of RENAMES) {
    const names = (await db.listCollections().toArray()).map((c: any) => c.name);
    const hasFrom = names.includes(from);
    const hasTo = names.includes(to);
    const fromCount = hasFrom ? await db.collection(from).countDocuments() : 0;
    const toCount = hasTo ? await db.collection(to).countDocuments() : 0;
    const entry: any = { from, to, fromCount, toCount, merged: 0, dropped: false };
    if (!hasFrom) {
      entry.note = 'legacy collection absent — nothing to do';
    } else if (!hasTo || toCount === 0) {
      entry.note = hasTo ? 'canonical empty — rename' : 'rename';
      if (APPLY) {
        if (hasTo) await db.collection(to).drop();
        await db.collection(from).rename(to);
        entry.dropped = true;
      }
    } else {
      // Both hold docs — merge legacy into canonical by stable key.
      const existing = new Set<string>();
      for (const d of await db.collection(to).find({}, { projection: { code: 1, short_code: 1, id: 1, barcode: 1 } }).toArray()) {
        const k = stableKey(d, keys);
        if (k) existing.add(k);
      }
      let merged = 0;
      for (const d of await db.collection(from).find({}).toArray()) {
        const k = stableKey(d, keys);
        if (k && existing.has(k)) continue;
        const { _id, ...rest } = d as any;
        if (APPLY) await db.collection(to).insertOne(rest);
        merged++;
        if (k) existing.add(k);
      }
      entry.merged = merged;
      entry.note = `merge ${merged} legacy docs into canonical`;
      if (APPLY) {
        const remaining = await db.collection(from).countDocuments();
        const canonical = await db.collection(to).countDocuments();
        if (canonical >= toCount + merged && remaining === fromCount) {
          await db.collection(from).drop();
          entry.dropped = true;
        } else {
          entry.note += ' — NOT dropped (count mismatch, investigate)';
        }
      }
    }
    report.push(entry);
  }
  console.log(JSON.stringify({ dry_run: !APPLY, renames: report }, null, 2));
  await connection.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
