// Issue 1556: structured ingredients / dosage_form / route for catalogue medicines, parsed from the stored text.
// Dry run by default: reads and reports, writes nothing. --queue (issue 1556 PR 2) writes pending admin review requests for
// rows the parser cannot read with confidence, on a test database only. No mode writes a medicine: an admin approves each row.
//
// Prints coverage before and the projected coverage after, per field, and the rows that would go to the admin's
// review queue (catalog_change_requests, type ingredients_review) with their reason.
// Scope (owner, 2026-10-16, decision H): only the medicine categories (INGREDIENTS_SCOPE_CATEGORIES, 2,575 records);
// cosmetics and devices are counted as out_of_scope and never reach the queue.
//
// Usage (reads only):
//   MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-ingredients.ts
//   npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-ingredients.ts --fixture=<rows.json>   (a JSON array of catalogue rows)
//   add --samples=N to print N example rows per outcome.
import fs from 'fs';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import {
  INGREDIENTS_PARSER_VERSION, INGREDIENTS_SCOPE_CATEGORIES, INGREDIENTS_SCOPE_FILTER, ParseResult, inIngredientsScope, parseCatalogueRow,
} from '../../src/modules/medicines/ingredients';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
if (process.argv.includes('--apply')) {
  console.error('--apply is not available yet: the ingredient rules wait for the data report on issue 1556 (dry-run only).');
  process.exit(2);
}
const FIXTURE = arg('fixture');
const SAMPLES = Number(arg('samples') || 0);

// --queue (issue 1556 PR 2): writes one pending `ingredients_review` change request per row the parser cannot read with
// confidence, into the admin queue. It never writes a medicine: the value is written only when an admin approves it.
// Guards: ALLOW_INGREDIENT_QUEUE=1, an explicit DB_NAME (not the default), a name without "prod", and no fixture.
const QUEUE = process.argv.includes('--queue');
if (QUEUE) {
  const dbName = process.env.DB_NAME || '';
  if (process.env.ALLOW_INGREDIENT_QUEUE !== '1') { console.error('--queue needs ALLOW_INGREDIENT_QUEUE=1'); process.exit(2); }
  if (!dbName || dbName === 'nabd' || /prod/i.test(dbName) || /prod/i.test(process.env.MONGODB_URI || process.env.MONGO_URL || '')) {
    console.error('--queue refuses this database: set DB_NAME to a test database (never the default or production)'); process.exit(2);
  }
  if (FIXTURE) { console.error('--queue cannot be combined with --fixture'); process.exit(2); }
}

type Row = Record<string, any>;

function tally() {
  return {
    total: 0, active_ingredient: 0, form: 0, strength: 0, ingredients: 0, ingredients_all_strengths: 0, dosage_form: 0, route: 0,
    to_review: 0, leaflets_to_move: 0, no_source: 0, from_name: 0, reasons: {} as Record<string, number>,
  };
}

let outOfScope = 0;

async function* rows(): AsyncGenerator<Row> {
  if (FIXTURE) {
    for (const r of JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as Row[]) if (inIngredientsScope(r)) yield r; else outOfScope += 1;
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017', { dbName: process.env.DB_NAME || 'nabd' });
  const cur = mongoose.connection.collection('medicines').find({ is_deleted: { $ne: true }, ...INGREDIENTS_SCOPE_FILTER }).sort({ _id: 1 }).batchSize(500);
  for await (const r of cur) yield r as Row;
}

let queued = 0;
let alreadyQueued = 0;

/** One pending review request per medicine (no second one while the first is open). */
async function queueReview(r: Row, p: ParseResult) {
  const requests = mongoose.connection.collection('catalog_change_requests');
  const open = await requests.findOne({ medicine_id: r.id, type: 'ingredients_review', status: 'pending' }, { projection: { _id: 1 } });
  if (open) { alreadyQueued += 1; return; }
  const now = new Date();
  await requests.insertOne({
    id: randomUUID(),
    type: 'ingredients_review',
    medicine_id: r.id,
    medicine_name: r.name_ar || r.name_en || null,
    changes: { dosage_form: p.dosage_form, route: p.route, ingredients: [] },
    current_values: { active_ingredient: r.active_ingredient ?? null, generic_name: r.generic_name ?? null, strength: r.strength ?? null, form: r.form ?? null },
    note: `parser: ${p.reasons.join(', ') || 'no ingredient found'}`,
    reporter_id: 'ingredients-migration',
    reporter_role: 'system',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });
  queued += 1;
}

async function run() {
  const before = tally();
  const after = tally();
  const samples: Record<string, unknown[]> = {};
  for await (const r of rows()) {
    before.total += 1; after.total += 1;
    if (r.active_ingredient) before.active_ingredient += 1;
    if (r.form) before.form += 1;
    if (r.strength) before.strength += 1;
    if (Array.isArray(r.ingredients) && r.ingredients.length) before.ingredients += 1;
    if (r.dosage_form) before.dosage_form += 1;
    if (r.route) before.route += 1;
    if (r.active_ingredient) { after.active_ingredient += 1; }
    if (r.form) after.form += 1;
    if (r.strength) after.strength += 1;
    // An admin-reviewed row is never re-parsed.
    if (r.ingredients_status === 'reviewed') {
      if (r.ingredients?.length) after.ingredients += 1;
      if (r.dosage_form) after.dosage_form += 1;
      if (r.route) after.route += 1;
      continue;
    }
    const p: ParseResult = parseCatalogueRow({ ...r, official_name: r.translations?.ar?.official_name ?? r.official_name });
    if (p.ingredients.length) after.ingredients += 1;
    if (p.ingredients.length && p.ingredients.every((i) => i.strength_value !== null)) after.ingredients_all_strengths += 1;
    if (p.dosage_form) after.dosage_form += 1;
    if (p.route) after.route += 1;
    if (p.source === 'name') after.from_name += 1;
    if (p.status === 'review') after.to_review += 1;
    if (p.leaflet) { after.leaflets_to_move += 1; after.active_ingredient -= 1; }
    if (p.status === 'none' && !r.active_ingredient && !r.generic_name) after.no_source += 1;
    for (const reason of p.reasons) after.reasons[reason] = (after.reasons[reason] || 0) + 1;
    if (QUEUE && p.status === 'review') await queueReview(r, p);
    const key = p.status === 'review' ? `review:${p.reasons.join('+')}` : p.status;
    if (SAMPLES && (samples[key] ||= []).length < SAMPLES) {
      samples[key].push({ id: r.id, active_ingredient: String(r.active_ingredient || '').slice(0, 120), strength: r.strength, form: r.form, ingredients: p.ingredients, dosage_form: p.dosage_form, route: p.route, unknown: p.unknown });
    }
  }
  console.log(JSON.stringify({ mode: QUEUE ? 'queue' : 'dry-run', queued, already_queued: alreadyQueued, parser: INGREDIENTS_PARSER_VERSION, source: FIXTURE ? `fixture ${FIXTURE}` : `db ${process.env.DB_NAME || 'nabd'}`, scope: INGREDIENTS_SCOPE_CATEGORIES, out_of_scope_skipped: FIXTURE ? outOfScope : 'filtered in the query', before, after_projected: after }, null, 1));
  if (SAMPLES) console.log(JSON.stringify(samples, null, 1));
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => null);
    process.exit(1);
  });
