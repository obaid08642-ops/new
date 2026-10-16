// Issue 1556: structured ingredients / dosage_form / route for catalogue medicines, parsed from the stored text.
// DRY-RUN ONLY for now (owner, 2026-10-16): the review session's field-by-field data report on issue 1556 comes
// first; until then this script reads and reports, and writes nothing. The write mode is added once the rules are final.
//
// Prints coverage before and the projected coverage after, per field, and the rows that would go to the admin's
// review queue (catalog_change_requests, type ingredients_review) with their reason.
//
// Usage (reads only):
//   MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-ingredients.ts
//   npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-ingredients.ts --fixture=<rows.json>   (a JSON array of catalogue rows)
//   add --samples=N to print N example rows per outcome.
import fs from 'fs';
import mongoose from 'mongoose';
import { INGREDIENTS_PARSER_VERSION, ParseResult, parseCatalogueRow } from '../../src/modules/medicines/ingredients';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
if (process.argv.includes('--apply')) {
  console.error('--apply is not available yet: the ingredient rules wait for the data report on issue 1556 (dry-run only).');
  process.exit(2);
}
const FIXTURE = arg('fixture');
const SAMPLES = Number(arg('samples') || 0);

type Row = Record<string, any>;

function tally() {
  return {
    total: 0, active_ingredient: 0, form: 0, strength: 0, ingredients: 0, ingredients_all_strengths: 0, dosage_form: 0, route: 0,
    to_review: 0, leaflets_to_move: 0, no_source: 0, from_name: 0, reasons: {} as Record<string, number>,
  };
}

async function* rows(): AsyncGenerator<Row> {
  if (FIXTURE) {
    for (const r of JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as Row[]) yield r;
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017', { dbName: process.env.DB_NAME || 'nabd' });
  const cur = mongoose.connection.collection('medicines').find({ is_deleted: { $ne: true } }).sort({ _id: 1 }).batchSize(500);
  for await (const r of cur) yield r as Row;
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
    const key = p.status === 'review' ? `review:${p.reasons.join('+')}` : p.status;
    if (SAMPLES && (samples[key] ||= []).length < SAMPLES) {
      samples[key].push({ id: r.id, active_ingredient: String(r.active_ingredient || '').slice(0, 120), strength: r.strength, form: r.form, ingredients: p.ingredients, dosage_form: p.dosage_form, route: p.route, unknown: p.unknown });
    }
  }
  console.log(JSON.stringify({ mode: 'dry-run', parser: INGREDIENTS_PARSER_VERSION, source: FIXTURE ? `fixture ${FIXTURE}` : `db ${process.env.DB_NAME || 'nabd'}`, before, after_projected: after }, null, 1));
  if (SAMPLES) console.log(JSON.stringify(samples, null, 1));
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => null);
    process.exit(1);
  });
