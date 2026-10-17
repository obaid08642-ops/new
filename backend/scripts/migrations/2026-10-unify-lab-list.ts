/**
 * #1556 owner decision F (2026-10-16): one lab list. `lab_services` is the only source
 * (CATALOG_COLLECTIONS.lab_services; every reader and the seeder use it). The production audit found an older
 * parallel list, `lab_tests` (51 rows), that no code reads any more.
 *
 * For every legacy row:
 *   - same test already in lab_services (same normalized Arabic/English name or code, catalog-dedupe.ts):
 *     the lab_services row gets the fields only the legacy row had; references to the legacy id/code are re-pointed;
 *   - otherwise it is added to lab_services in the current shape with medical_review_status 'pending'
 *     (not shown to patients until the admin approves it) and provenance 'lab_tests'.
 * Then the legacy rows are copied to archive_<legacy> and the legacy collection is dropped once it is empty.
 *
 * - Dry-run default; `--apply` writes. Idempotent.
 * - NODE_ENV=production is refused unless CONFIRM_LAB_LIST=yes.
 *
 * Run: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-unify-lab-list.ts [--apply]
 */
import { randomUUID } from 'crypto';
import { connect, connection } from 'mongoose';
import { CatalogDoc, identityKeys, missingFields, nameAr, nameEn, rewritePath } from '../../src/modules/catalogs/catalog-dedupe';

const APPLY = process.argv.includes('--apply');
export const LEGACY_LAB_LISTS = ['lab_tests'];
const REFS = [
  { collection: 'labbookings', path: 'items.service_id' },
  { collection: 'lab_bookings', path: 'items.service_id' },
  { collection: 'provider_capabilities_lab', path: 'code' },
  { collection: 'provider_profiles', path: 'test_categories' },
  { collection: 'lab_services', path: 'included_services' },
];

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** A legacy row in the lab_services shape (old field names: test_name_ar/en, ar/en, code, test_code). */
export function toLabService(x: CatalogDoc): CatalogDoc {
  const code = str(x.short_code) || str(x.test_code) || str(x.code);
  const out: CatalogDoc = {
    name_ar: nameAr(x) || str(x.test_name_ar),
    name_en: nameEn(x) || str(x.test_name_en),
    category: str(x.category) || 'blood',
    sample_type: str(x.sample_type) || 'blood',
    price: typeof x.price === 'number' ? x.price : 0,
  };
  if (code) out.short_code = code;
  for (const k of ['description_ar', 'description_en', 'preparation_ar', 'preparation_en', 'fasting_required', 'fasting_hours', 'turnaround_hours', 'is_package', 'included_services']) {
    if (x[k] !== undefined && x[k] !== null && x[k] !== '') out[k] = x[k];
  }
  return out;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_LAB_LIST !== 'yes') {
    throw new Error('refused: NODE_ENV=production needs CONFIRM_LAB_LIST=yes');
  }
  await connect(process.env.MONGODB_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const names = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const svc = db.collection('lab_services');
  const report: unknown[] = [];
  for (const legacy of LEGACY_LAB_LISTS) {
    const entry: Record<string, unknown> = { legacy, matched: [] as unknown[], added: [] as unknown[], references: [] as unknown[], dropped: false };
    report.push(entry);
    if (!names.has(legacy)) {
      entry.note = 'legacy list absent';
      continue;
    }
    const current = (await svc.find({}).toArray()) as unknown as CatalogDoc[];
    const byKey = new Map<string, CatalogDoc>();
    for (const d of current) for (const k of identityKeys(d, { byPackage: true })) if (!byKey.has(k)) byKey.set(k, d);
    const map = new Map<string, string>();
    const rows = (await db.collection(legacy).find({}).toArray()) as unknown as CatalogDoc[];
    entry.rows = rows.length;
    for (const x of rows) {
      const shaped = toLabService(x);
      const hit = identityKeys(shaped, { byPackage: true }).map((k) => byKey.get(k)).find(Boolean);
      const legacyId = str(x.id) || String(x._id);
      if (hit) {
        const fill = missingFields(hit, [shaped]);
        (entry.matched as unknown[]).push({ legacy: legacyId, lab_service: hit.id, name_en: shaped.name_en, filled: Object.keys(fill) });
        if (APPLY && Object.keys(fill).length) await svc.updateOne({ _id: hit._id } as never, { $set: fill });
        map.set(legacyId, str(hit.id));
        const lc = str(shaped.short_code);
        const hc = str(hit.short_code) || str(hit.test_code);
        if (lc && hc && lc !== hc) map.set(lc, hc);
        continue;
      }
      if (!shaped.name_ar || !shaped.name_en) {
        (entry.added as unknown[]).push({ legacy: legacyId, skipped: 'no Arabic or English name' });
        continue;
      }
      const id = randomUUID();
      const doc = { ...shaped, id, active: true, is_deleted: false, public_eligibility: false, medical_review_status: 'pending', provenance: legacy };
      (entry.added as unknown[]).push({ legacy: legacyId, lab_service: id, name_en: shaped.name_en });
      map.set(legacyId, id);
      if (APPLY) await svc.insertOne(doc);
      for (const k of identityKeys(doc as CatalogDoc, { byPackage: true })) byKey.set(k, doc as CatalogDoc);
    }
    for (const ref of REFS) {
      if (!names.has(ref.collection) || !map.size) continue;
      const rc = db.collection(ref.collection);
      for (const doc of await rc.find({ [ref.path]: { $in: [...map.keys()] } }).toArray()) {
        const copy = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
        const n = rewritePath(copy, ref.path, map);
        if (!n) continue;
        const top = ref.path.split('.')[0];
        (entry.references as unknown[]).push({ collection: ref.collection, doc: doc.id ?? String(doc._id), path: ref.path, values: n });
        if (APPLY) await rc.updateOne({ _id: doc._id }, { $set: { [top]: copy[top] } });
      }
    }
    if (APPLY) {
      const archive = db.collection(`archive_${legacy}`);
      for (const x of rows) {
        await archive.updateOne({ _id: x._id } as never, { $setOnInsert: { ...x, archived_at: new Date(), merged_into: map.get(str(x.id) || String(x._id)) ?? null } }, { upsert: true });
        if ((await archive.countDocuments({ _id: x._id } as never, { limit: 1 })) === 1) await db.collection(legacy).deleteOne({ _id: x._id } as never);
      }
      if ((await db.collection(legacy).countDocuments()) === 0) {
        await db.collection(legacy).drop();
        entry.dropped = true;
      }
    }
  }
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', report }));
}

if (require.main === module) {
  main()
    .then(() => connection.close())
    .catch(async (e) => {
      console.error(e?.message || e);
      await connection.close().catch(() => undefined);
      process.exit(1);
    });
}
