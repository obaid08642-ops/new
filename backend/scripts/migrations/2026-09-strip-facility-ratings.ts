/*
 * F16: strip fabricated facility ratings from seeded reference listings.
 * The 6 SEED_FACILITIES docs were inserted with invented rating/reviews_count
 * (e.g. rating:4.8, reviews_count:1240). Seeds are insert-only ($setOnInsert),
 * so existing docs keep the fake numbers until this migration unsets them and
 * marks the docs status:'reference' (public API then omits rating fields).
 *
 * DEFAULT IS DRY-RUN: prints match counts and changes nothing.
 * Apply with:  node scripts/migrations/2026-09-strip-facility-ratings.ts --apply
 * Requires MONGODB_URI. Intended for staging/prod owner runs, never app boot.
 */
const mongoose = require('mongoose');

const DRY = !process.argv.includes('--apply');
const SEED_SLUGS = [
  'king-faisal-specialist',
  'dallah-hospital',
  'saudi-german-hospital',
  'kingdom-hospital',
  'prince-sultan-cardiac',
  'andalusia-clinic',
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;

  const filter = {
    $or: [
      { slug: { $in: SEED_SLUGS } },
      // catch any seeded doc still carrying the exact fabricated pairs
      { rating: 4.8, reviews_count: 1240 },
      { rating: 4.6, reviews_count: 980 },
    ],
  };
  const matched = await db.collection('facilities').countDocuments(filter);
  console.log(JSON.stringify({ dry_run: DRY, matched }, null, 2));
  if (!DRY && matched) {
    const r = await db.collection('facilities').updateMany(filter, {
      $unset: { rating: '', reviews_count: '' },
      $set: { status: 'reference', public_eligibility: false, indexing_eligibility: false },
    });
    console.log(JSON.stringify({ modified: r.modifiedCount }));
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
