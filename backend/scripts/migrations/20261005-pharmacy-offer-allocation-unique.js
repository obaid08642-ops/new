/*
 * Manual, opt-in schema migration for 13.R1 (no duplicate pharmacy offers or
 * allocations). It is intentionally NOT invoked by application startup, tests,
 * or a scheduler. A fresh database gets these indexes from the mongoose schema
 * (pharmacy.schema.ts); an existing one still has the old non-unique indexes on
 * the same keys, which block the unique ones until they are replaced here.
 * Resolve any duplicates it reports and take a backup before setting
 * APPLY_DB_MIGRATION=20261005.
 */
const mongoose = require('mongoose');

const TARGETS = [
  {
    collection: 'pharmacy_offers',
    key: { order_id: 1, pharmacy_account_id: 1, version: -1 },
    name: 'pharmacy_offer_order_pharmacy_version_unique',
    group: { order_id: '$order_id', pharmacy_account_id: '$pharmacy_account_id', version: '$version' },
  },
  {
    collection: 'pharmacy_offers',
    key: { order_id: 1, pharmacy_account_id: 1 },
    name: 'pharmacy_offer_one_draft_unique',
    partialFilterExpression: { status: 'draft' },
    group: { order_id: '$order_id', pharmacy_account_id: '$pharmacy_account_id' },
    match: { status: 'draft' },
  },
  {
    collection: 'pharmacy_allocations',
    key: { order_id: 1, pharmacy_account_id: 1 },
    name: 'pharmacy_allocation_order_pharmacy_unique',
    group: { order_id: '$order_id', pharmacy_account_id: '$pharmacy_account_id' },
  },
];

const sameKey = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function main() {
  if (process.env.APPLY_DB_MIGRATION !== '20261005') {
    throw new Error('refusing_to_run_set_APPLY_DB_MIGRATION_20261005_after_approved_change_window');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  for (const target of TARGETS) {
    const col = db.collection(target.collection);
    const duplicates = await col.aggregate([
      ...(target.match ? [{ $match: target.match }] : []),
      { $group: { _id: target.group, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 5 },
    ]).toArray();
    if (duplicates.length) {
      throw new Error(`${target.collection}_has_duplicates_resolve_before_index_creation:${JSON.stringify(duplicates.map((d) => d._id))}`);
    }
    const existing = await col.listIndexes().toArray().catch(() => []);
    for (const ix of existing) {
      if (sameKey(ix.key, target.key) && ix.name !== target.name && !ix.partialFilterExpression && !target.partialFilterExpression) await col.dropIndex(ix.name);
    }
    await col.createIndex(target.key, {
      name: target.name,
      unique: true,
      ...(target.partialFilterExpression ? { partialFilterExpression: target.partialFilterExpression } : {}),
    });
  }
  console.log('pharmacy_offer_allocation_unique_indexes_applied');
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
