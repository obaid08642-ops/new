/**
 * #1556 owner decision F (2026-10-16): delete duplicate rows in the service catalogues
 * (lab_services, radiology_services, nursing_services, specialties, insurance_companies).
 *
 * For each group of rows that are the same service (catalog-dedupe.ts: same normalized Arabic or English
 * name, or same code), one row is kept (pickKeeper). Before anything is removed:
 *   1. the kept row gets the fields only a removed row had (content is not lost);
 *   2. every reference to a removed row's id or code is re-pointed to the kept row
 *      (bookings, provider capabilities and price lists, packages, insurance networks/rules/policies, profiles);
 *   3. the removed rows are copied to archive_<collection> (same _id, plus archived_at / merged_into).
 * Then the removed rows are deleted.
 *
 * - Dry-run default: prints the report (kept/removed ids, every re-pointed reference), changes nothing.
 * - `--apply` writes. Idempotent: a second run finds no groups.
 * - NODE_ENV=production is refused unless CONFIRM_SERVICES_DEDUPE=yes.
 * - `--only=lab_services,specialties` limits the catalogues.
 *
 * Run: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-services-dedupe.ts [--apply]
 */
import { connect, connection } from 'mongoose';
import {
  CatalogDoc, duplicateGroups, missingFields, nameAr, nameEn, pickKeeper, referenceMap, rewritePath,
} from '../../src/modules/catalogs/catalog-dedupe';

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length).split(',').filter(Boolean);

type Ref = { collection: string; path: string };

/** Where each catalogue's rows are referenced (by id or code). Absent collections are skipped. */
export const CATALOGUES: Array<{ collection: string; byPackage?: boolean; refs: Ref[] }> = [
  {
    collection: 'lab_services',
    byPackage: true,
    refs: [
      { collection: 'labbookings', path: 'items.service_id' },
      { collection: 'lab_bookings', path: 'items.service_id' },
      { collection: 'provider_capabilities_lab', path: 'code' },
      { collection: 'provider_profiles', path: 'test_categories' },
      { collection: 'lab_services', path: 'included_services' },
    ],
  },
  {
    collection: 'radiology_services',
    refs: [
      { collection: 'radiologybookings', path: 'items.service_id' },
      { collection: 'radiology_bookings', path: 'items.service_id' },
      { collection: 'provider_profiles', path: 'test_categories' },
    ],
  },
  {
    collection: 'nursing_services',
    refs: [
      { collection: 'homecarebookings', path: 'service_id' },
      { collection: 'nursingbookings', path: 'service_id' },
      { collection: 'homecarepackages', path: 'service_ids' },
      { collection: 'homecarenurses', path: 'supported_services' },
      { collection: 'provider_profiles', path: 'nursing_services.key' },
    ],
  },
  {
    collection: 'specialties',
    refs: [
      { collection: 'provider_profiles', path: 'specialty' },
      { collection: 'provider_profiles', path: 'sub_specialties' },
      { collection: 'hospitaldepartments', path: 'specialty_code' },
      { collection: 'conditions', path: 'specialties' },
    ],
  },
  {
    collection: 'insurance_companies',
    refs: [
      { collection: 'insurance_networks', path: 'company_id' },
      { collection: 'insurance_coverage_rules', path: 'company_id' },
      { collection: 'insurance_claims', path: 'company_id' },
      { collection: 'insurancepolicies', path: 'company_id' },
      { collection: 'patient_profiles', path: 'insurance.company_id' },
      { collection: 'provider_profiles', path: 'accepted_insurance' },
    ],
  },
];

function guard() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_SERVICES_DEDUPE !== 'yes') {
    throw new Error('refused: NODE_ENV=production needs CONFIRM_SERVICES_DEDUPE=yes');
  }
}

/** A filter matching documents whose `path` holds any of `values` (Mongo walks arrays of objects by dot path). */
function refFilter(path: string, values: string[]) {
  return { [path]: { $in: values } };
}

async function main() {
  guard();
  await connect(process.env.MONGODB_URI as string, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const names = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const report: Array<Record<string, unknown>> = [];

  for (const cat of CATALOGUES) {
    if (ONLY.length && !ONLY.includes(cat.collection)) continue;
    const entry: Record<string, unknown> = { collection: cat.collection, groups: [] as unknown[], removed: 0, repointed: 0 };
    report.push(entry);
    if (!names.has(cat.collection)) {
      entry.note = 'collection absent';
      continue;
    }
    const col = db.collection(cat.collection);
    const docs = (await col.find({}).toArray()) as unknown as CatalogDoc[];
    entry.rows_before = docs.length;
    for (const group of duplicateGroups(docs, { byPackage: cat.byPackage })) {
      const keep = pickKeeper(group);
      const removed = group.filter((d) => d !== keep);
      const map = referenceMap(keep, removed);
      const fill = missingFields(keep, removed);
      const g: Record<string, unknown> = {
        name_ar: nameAr(keep), name_en: nameEn(keep),
        kept: keep.id ?? String(keep._id), removed: removed.map((r) => r.id ?? String(r._id)),
        filled_from_removed: Object.keys(fill), references: [] as unknown[],
      };
      (entry.groups as unknown[]).push(g);
      if (APPLY && Object.keys(fill).length) await col.updateOne({ _id: keep._id } as never, { $set: fill });
      const values = [...map.keys()];
      for (const ref of cat.refs) {
        if (!names.has(ref.collection) || !values.length) continue;
        const rc = db.collection(ref.collection);
        for (const doc of await rc.find(refFilter(ref.path, values)).toArray()) {
          // A package of the catalogue itself that is being removed is not re-pointed (it goes too).
          if (ref.collection === cat.collection && removed.some((r) => String(r._id) === String(doc._id))) continue;
          const copy = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
          const n = rewritePath(copy, ref.path, map);
          if (!n) continue;
          const top = ref.path.split('.')[0];
          (g.references as unknown[]).push({ collection: ref.collection, doc: doc.id ?? String(doc._id), path: ref.path, values: n });
          entry.repointed = (entry.repointed as number) + n;
          if (APPLY) await rc.updateOne({ _id: doc._id }, { $set: { [top]: copy[top] } });
        }
      }
      // Networks moved onto the kept insurer may now repeat one of its own (same code or name): one row each.
      if (cat.collection === 'insurance_companies' && names.has('insurance_networks')) {
        const keepId = String(keep.id ?? keep._id);
        const nets = db.collection('insurance_networks');
        const own = (await nets.find({ company_id: { $in: [keepId, ...values] } }).toArray()) as unknown as CatalogDoc[];
        const netReport: unknown[] = [];
        for (const ng of duplicateGroups(own)) {
          const nk = pickKeeper(ng);
          const nr = ng.filter((d) => d !== nk);
          const nmap = referenceMap(nk, nr);
          netReport.push({ kept: nk.id ?? String(nk._id), removed: nr.map((r) => r.id ?? String(r._id)) });
          if (!APPLY) continue;
          if (names.has('insurance_coverage_rules')) {
            for (const [from, to] of nmap) await db.collection('insurance_coverage_rules').updateMany({ network_id: from }, { $set: { network_id: to } });
          }
          for (const r of nr) {
            await db.collection('archive_insurance_networks').updateOne({ _id: r._id } as never, { $setOnInsert: { ...r, archived_at: new Date(), merged_into: nk.id } }, { upsert: true });
            await nets.deleteOne({ _id: r._id } as never);
          }
        }
        if (netReport.length) g.networks_merged = netReport;
      }
      if (APPLY) {
        const archive = db.collection(`archive_${cat.collection}`);
        const at = new Date();
        for (const r of removed) {
          await archive.updateOne({ _id: r._id } as never, { $setOnInsert: { ...r, archived_at: at, merged_into: keep.id ?? String(keep._id) } }, { upsert: true });
          if ((await archive.countDocuments({ _id: r._id } as never, { limit: 1 })) === 1) await col.deleteOne({ _id: r._id } as never);
        }
      }
      entry.removed = (entry.removed as number) + removed.length;
    }
    entry.rows_after = APPLY ? await col.countDocuments() : (entry.rows_before as number) - (entry.removed as number);
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
