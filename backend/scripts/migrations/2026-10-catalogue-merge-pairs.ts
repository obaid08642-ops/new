/**
 * Reviewed duplicate pairs (2026-10-23, docs/catalog-audit-gaps.md): 3 lab packages and 4 nursing services that the market
 * audit lists as the same service twice. NOT RUN on production: needs owner approval.
 * Pairs: src/modules/catalogs/content/catalog-merge-pairs.v1.json (delete a pair there to exclude it).
 *
 * For each pair, among the rows that match it (name in either language, or code):
 *   1. the OLDER row is kept (createdAt, else ObjectId time) and keeps its id;
 *   2. every reference to the other row's id or code is re-pointed to the kept row (same reference map as
 *      2026-10-services-dedupe.ts: bookings, provider capabilities and lists, packages, profiles);
 *   3. fields only the other row has are copied onto the kept row (nothing is lost);
 *   4. the other row is copied to archive_<collection> and then SWITCHED OFF in place (active false, is_deleted true,
 *      public_eligibility false, merged_into, merged_at). It is never deleted, so a reference this script does not know of
 *      still resolves, and the seed upsert still finds the row and does not insert it again.
 * Reported for the owner and not decided here: a differing price, and a provider that now lists the same service twice.
 *
 * - Dry-run default; `--apply` writes. Idempotent: a merged row no longer matches its pair, so a second run finds nothing.
 * - NODE_ENV=production is refused unless CONFIRM_CATALOGUE_MERGE_PAIRS=yes.
 *
 * Run: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-merge-pairs.ts [--apply]
 */
import * as fs from 'fs';
import * as path from 'path';
import { connect, connection } from 'mongoose';
import { CatalogDoc, missingFields, nameEn, referenceMap, rewritePath } from '../../src/modules/catalogs/catalog-dedupe';
import { MergePair, matchesPair, olderRow, rowId } from '../../src/modules/catalogs/catalog-merge-pairs';
import { CATALOGUES } from './2026-10-services-dedupe';

const APPLY = process.argv.includes('--apply');
export const PAIRS_FILE = path.join(__dirname, '../../src/modules/catalogs/content/catalog-merge-pairs.v1.json');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_CATALOGUE_MERGE_PAIRS !== 'yes') {
    throw new Error('refused: NODE_ENV=production needs CONFIRM_CATALOGUE_MERGE_PAIRS=yes');
  }
  const pairs: MergePair[] = JSON.parse(fs.readFileSync(PAIRS_FILE, 'utf8')).pairs;
  await connect(process.env.MONGODB_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const names = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const report: Array<Record<string, unknown>> = [];

  for (const pair of pairs) {
    const cat = CATALOGUES.find((c) => c.collection === pair.catalogue);
    const entry: Record<string, unknown> = { pair: pair.id, collection: pair.catalogue };
    report.push(entry);
    if (!cat || !names.has(cat.collection)) { entry.note = 'collection absent'; continue; }
    const col = db.collection(cat.collection);
    const rows = (await col.find({}).toArray()) as unknown as CatalogDoc[];
    const group = rows.filter((r) => matchesPair(r, pair));
    entry.matched = group.map((r) => nameEn(r) || rowId(r));
    if (group.length < 2) { entry.note = group.length ? 'only one row matches: nothing to merge' : 'no row matches'; continue; }
    const keep = olderRow(group);
    const removed = group.filter((r) => r !== keep);
    const map = referenceMap(keep, removed);
    const fill = missingFields(keep, removed);
    entry.kept = rowId(keep);
    entry.kept_name = nameEn(keep);
    entry.removed = removed.map(rowId);
    entry.filled_from_removed = Object.keys(fill);
    entry.price_differs = removed.filter((r) => r.price !== undefined && keep.price !== undefined && r.price !== keep.price).map((r) => ({ id: rowId(r), price: r.price, kept_price: keep.price }));
    const references: unknown[] = [];
    const providerDuplicates: unknown[] = [];
    entry.references = references;
    entry.provider_duplicates = providerDuplicates;

    const forced = pair.set_on_kept || {};
    entry.set_on_kept = Object.keys(forced);
    if (APPLY && (Object.keys(fill).length || Object.keys(forced).length)) await col.updateOne({ _id: keep._id } as never, { $set: { ...fill, ...forced } });
    const values = [...map.keys()];
    for (const ref of cat.refs) {
      if (!names.has(ref.collection) || !values.length) continue;
      const rc = db.collection(ref.collection);
      for (const doc of await rc.find({ [ref.path]: { $in: values } }).toArray()) {
        if (ref.collection === cat.collection && removed.some((r) => String(r._id) === String(doc._id))) continue;
        const copy = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
        const n = rewritePath(copy, ref.path, map);
        if (!n) continue;
        references.push({ collection: ref.collection, doc: doc.id ?? String(doc._id), path: ref.path, values: n });
        // A provider whose list held both services now names the kept one twice: reported, not resolved.
        const top = ref.path.split('.')[0];
        const list = copy[top];
        if (Array.isArray(list) && list.length && typeof list[0] === 'object') {
          const keys = (list as Array<Record<string, unknown>>).map((x) => String(x[ref.path.split('.').slice(1).join('.')] ?? ''));
          if (new Set(keys).size < keys.length) providerDuplicates.push({ collection: ref.collection, doc: doc.id ?? String(doc._id), path: ref.path });
        }
        if (APPLY) await rc.updateOne({ _id: doc._id }, { $set: { [top]: copy[top] } });
      }
    }
    if (APPLY) {
      const archive = db.collection(`archive_${cat.collection}`);
      const at = new Date();
      for (const r of removed) {
        await archive.updateOne({ _id: r._id } as never, { $setOnInsert: { ...r, archived_at: at, merged_into: rowId(keep) } }, { upsert: true });
        await col.updateOne({ _id: r._id } as never, { $set: { active: false, is_active: false, is_deleted: true, public_eligibility: false, merged_into: rowId(keep), merged_at: at } });
      }
    }
    // Anything still pointing at a switched-off row (a reference this script does not know of) is listed.
    let still = 0;
    if (APPLY) for (const ref of cat.refs) if (names.has(ref.collection)) still += await db.collection(ref.collection).countDocuments({ [ref.path]: { $in: values } });
    entry.still_referenced = APPLY ? still : 'n/a (dry-run)';
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
