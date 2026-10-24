/**
 * Medicine name translations (2026-10-24). DRY RUN BY DEFAULT. NOT RUN ON PRODUCTION: needs owner approval to apply.
 *
 * Source: data/catalogue-input-01/medicine-translations-2026-10-24.csv (machine-proposed, needs native review: one row per
 * English/Latin source string, with ur, hi, bn and fil). It fills only the display fields `name` and `official_name`, and
 * only where the stored value is empty or still the untranslated Latin text. An existing translation is never overwritten.
 *
 * Coverage is read from an export, so the dry run never connects to a database:
 *   npx ts-node --transpile-only scripts/migrations/2026-10-medicine-translations-fill.ts --export=<medicines.json>
 * Apply (owner approval first): needs --apply, CONFIRM_MEDICINE_TRANSLATIONS=yes, MONGODB_URI and DB_NAME. Production names
 * (containing "prod", or the default "nabd") are refused.
 *
 * --test-seed (local test database only): fills the six locales of the seeded test medicines with their English values, so the
 * test database passes missingPublicMedicineTranslations. Test data only; refused for any database name without "test" or "live".
 */
import * as fs from 'fs';
import * as path from 'path';
import { connect, connection } from 'mongoose';

const APPLY = process.argv.includes('--apply');
const TEST_SEED = process.argv.includes('--test-seed');
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const EXPORT = arg('export');
const CSV = path.join(__dirname, '../../../data/catalogue-input-01/medicine-translations-2026-10-24.csv');

/** Locale key in the database (translations.<key>) and the CSV column. */
const LOCALES: Array<{ key: 'ur' | 'hi' | 'bn' | 'tl'; col: 'ur' | 'hi' | 'bn' | 'fil'; script: RegExp | null }> = [
  { key: 'ur', col: 'ur', script: /[؀-ۿ]/ },
  { key: 'hi', col: 'hi', script: /[ऀ-ॿ]/ },
  { key: 'bn', col: 'bn', script: /[ঀ-৿]/ },
  { key: 'tl', col: 'fil', script: null },
];

/** A minimal CSV reader for the quoted fields of the translation file. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; } else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}

export type Translation = { ur: string; hi: string; bn: string; fil: string };

export function loadTranslations(csvText: string): Map<string, Translation> {
  const [header, ...rows] = parseCsv(csvText);
  const at = (name: string) => header.indexOf(name);
  const map = new Map<string, Translation>();
  for (const r of rows) {
    const source = r[at('source')]?.trim();
    if (!source) continue;
    map.set(source, { ur: r[at('ur')] || '', hi: r[at('hi')] || '', bn: r[at('bn')] || '', fil: r[at('fil')] || '' });
  }
  return map;
}

/** A value still needs a translation when it is empty, or still the untranslated source text for that locale. */
export function needsTranslation(value: unknown, locale: (typeof LOCALES)[number], nameEn: string): boolean {
  const v = String(value ?? '').trim();
  if (!v) return true;
  if (locale.script) return !locale.script.test(v);
  return v === nameEn.trim();
}

export type Plan = { id: string; set: Record<string, string> };
export type Report = Record<string, { gaps: number; matched: number; unmatched: number }> & { planned: number; untranslatable_fragments: string[] };

/** Builds the update plan for the medicine rows and the report the dry run prints. */
export function planTranslations(rows: any[], map: Map<string, Translation>): { plans: Plan[]; report: Report } {
  const report: any = { planned: 0, untranslatable_fragments: [] as string[] };
  for (const l of LOCALES) report[l.key] = { gaps: 0, matched: 0, unmatched: 0 };
  const plans: Plan[] = [];
  for (const r of rows) {
    if (r.is_deleted === true) continue;
    const set: Record<string, string> = {};
    const nameEn = String(r.name_en || '');
    for (const loc of LOCALES) {
      for (const field of ['name', 'official_name'] as const) {
        const current = r.translations?.[loc.key]?.[field];
        const source = field === 'name' ? (String(current || '').trim() || nameEn) : String(current || '').trim();
        if (!source || !needsTranslation(current, loc, nameEn)) continue;
        if (field === 'name') report[loc.key].gaps += 1;
        const t = map.get(source) || map.get(nameEn);
        const value = t?.[loc.col];
        if (!value) { report[loc.key].unmatched += 1; if (/^[-\d\s.+]+$/.test(source)) report.untranslatable_fragments.push(source); continue; }
        if (field === 'name') report[loc.key].matched += 1;
        set[`translations.${loc.key}.${field}`] = value;
      }
    }
    if (Object.keys(set).length) { plans.push({ id: r.id, set }); report.planned += 1; }
  }
  report.untranslatable_fragments = [...new Set(report.untranslatable_fragments)];
  return { plans, report };
}

/** Test database only: the six locales copied from the English values, so the seeded test rows are complete. */
export function testSeedSet(r: any): Record<string, string> {
  const set: Record<string, string> = {};
  for (const loc of LOCALES) {
    const t = r.translations?.[loc.key] || {};
    if (!String(t.name || '').trim()) set[`translations.${loc.key}.name`] = String(r.name_en || r.name_ar || '');
    if (r.category && !String(t.main_category || '').trim()) set[`translations.${loc.key}.main_category`] = String(r.category);
    if (r.active_ingredient && !String(t.active_ingredient || '').trim()) set[`translations.${loc.key}.active_ingredient`] = String(r.active_ingredient);
    if (r.form && !String(t.dosage_form || '').trim()) set[`translations.${loc.key}.dosage_form`] = String(r.form);
    if (r.strength && !String(t.strength || '').trim()) set[`translations.${loc.key}.strength`] = String(r.strength);
  }
  return set;
}

function guardDatabase(name: string, testOnly: boolean) {
  if (!name || name === 'nabd' || /prod/i.test(name)) throw new Error(`refused: DB_NAME "${name}" is not a test database`);
  if (testOnly && !/test|live/i.test(name)) throw new Error(`--test-seed refused: DB_NAME "${name}" is not a test database`);
}

async function main() {
  const map = loadTranslations(fs.readFileSync(CSV, 'utf8'));
  if (TEST_SEED) {
    const dbName = process.env.DB_NAME || '';
    guardDatabase(dbName, true);
    if (!APPLY) throw new Error('--test-seed writes: add --apply');
    if (process.env.CONFIRM_MEDICINE_TRANSLATIONS !== 'yes') throw new Error('set CONFIRM_MEDICINE_TRANSLATIONS=yes');
    await connect(process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017', { dbName });
    const cur = connection.collection('medicines').find({ is_deleted: { $ne: true } }, { projection: { _id: 0 } });
    let n = 0;
    for await (const r of cur) {
      const set = testSeedSet(r);
      if (Object.keys(set).length) { await connection.collection('medicines').updateOne({ id: r.id }, { $set: set }); n += 1; }
    }
    console.log(JSON.stringify({ mode: 'test-seed', db: dbName, rows_updated: n }));
    await connection.close();
    return;
  }
  if (!EXPORT) throw new Error('dry run needs --export=<medicines.json> (a production export, read-only)');
  const rows = JSON.parse(fs.readFileSync(EXPORT, 'utf8'));
  const { plans, report } = planTranslations(rows, map);
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', export: EXPORT, medicines: rows.length, report }, null, 1));
  if (!APPLY) return;
  if (process.env.CONFIRM_MEDICINE_TRANSLATIONS !== 'yes') throw new Error('set CONFIRM_MEDICINE_TRANSLATIONS=yes');
  const dbName = process.env.DB_NAME || '';
  guardDatabase(dbName, false);
  await connect(process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017', { dbName });
  for (const p of plans) await connection.collection('medicines').updateOne({ id: p.id }, { $set: p.set });
  console.log(JSON.stringify({ applied: plans.length }));
  await connection.close();
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
