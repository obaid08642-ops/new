// Owner decision D (issue 1556, 2026-10-16): records that are one product in several powers, colours or shades become
// ONE product with a picker. Sets `variant_group` and `variant` from the English name (src/modules/medicines/variant-grouping.ts);
// deletes nothing, changes no name, price or picture. Idempotent: a second --apply changes nothing; a record that no
// longer belongs to a group (its name was corrected) loses only the fields this script wrote.
// Dry-run first (the default): prints the counts and, with --report <file>, writes every group for the owner.
// NEVER run on production (refused when NODE_ENV=production): the owner runs it after reading the dry-run report.
// Usage: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-variant-groups.ts [--report out.json] [--apply]
import { writeFileSync } from 'fs';
import mongoose from 'mongoose';
import { buildVariantGroups, VARIANT_SOURCE, type GroupInput } from '../../src/modules/medicines/variant-grouping';

const APPLY = process.argv.includes('--apply');
const reportAt = process.argv.indexOf('--report');
const REPORT = reportAt > -1 ? process.argv[reportAt + 1] : '';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'nabd';

type Row = GroupInput & { variant_group?: string; variant?: Record<string, unknown> };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function run() {
  if (process.env.NODE_ENV === 'production') {
    console.error('refused: NODE_ENV=production (decision D: never run on production; the owner runs it after the dry-run report)');
    process.exit(2);
  }
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const meds = mongoose.connection.collection('medicines');
  const rows = (await meds
    .find({ is_deleted: { $ne: true } }, { projection: { _id: 0, id: 1, sku: 1, name_en: 1, manufacturer: 1, image: 1, image_1: 1, images: 1, variant_group: 1, variant: 1 } })
    .toArray()) as unknown as Row[];
  const groups = buildVariantGroups(rows);
  const byId = new Map(rows.map((r) => [String(r.id), r]));

  const sets: Array<{ id: string; variant_group: string; variant: Record<string, unknown> }> = [];
  const grouped = new Set<string>();
  for (const g of groups) {
    for (const m of g.members) {
      grouped.add(m.id);
      const cur = byId.get(m.id);
      if (!cur || cur.variant_group !== g.variant_group || !same(cur.variant, m.variant)) sets.push({ id: m.id, variant_group: g.variant_group, variant: m.variant });
    }
  }
  // Only what this script wrote is cleared (an admin-set variant with another source is never touched).
  const clears = rows.filter((r) => !grouped.has(String(r.id)) && r.variant_group && (r.variant as { source?: string } | undefined)?.source === VARIANT_SOURCE).map((r) => String(r.id));

  const byKind: Record<string, { groups: number; records: number }> = {};
  for (const g of groups) {
    byKind[g.kind] = byKind[g.kind] || { groups: 0, records: 0 };
    byKind[g.kind].groups += 1;
    byKind[g.kind].records += g.members.length;
  }
  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    db: DB_NAME,
    records_scanned: rows.length,
    groups: groups.length,
    records_grouped: grouped.size,
    by_kind: byKind,
    groups_with_conflicts: groups.filter((g) => g.conflicts.length).length,
    would_set: sets.length,
    would_clear: clears.length,
  };
  if (REPORT) {
    writeFileSync(REPORT, JSON.stringify({
      ...summary,
      groups: groups.map((g) => ({
        variant_group: g.variant_group, base: g.base, manufacturer: g.manufacturer, kind: g.kind, size: g.members.length,
        conflicts: g.conflicts, members: g.members.map((m) => ({ id: m.id, sku: m.sku, name_en: m.name_en, ...m.variant })),
      })),
      clears,
    }, null, 2));
  }
  if (!APPLY) {
    console.log(JSON.stringify(summary));
    return;
  }
  let modified = 0;
  for (let i = 0; i < sets.length; i += 500) {
    const res = await meds.bulkWrite(sets.slice(i, i + 500).map((s) => ({
      updateOne: { filter: { id: s.id }, update: { $set: { variant_group: s.variant_group, variant: s.variant } } },
    })));
    modified += res.modifiedCount;
  }
  const cleared = clears.length ? (await meds.updateMany({ id: { $in: clears } }, { $unset: { variant_group: '', variant: '' } })).modifiedCount : 0;
  console.log(JSON.stringify({ ...summary, updated: modified, cleared }));
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => null);
    process.exit(1);
  });
