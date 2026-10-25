/**
 * Catalogue translation fill (2026-10-23). NOT RUN: owner approval is needed before it touches production.
 *
 * Writes what the seed-data files now carry and the database may lack:
 *   1. insurance_companies: description_<l> (the names stay ar/en only), and (TPAs) the corrected ar/en description;
 *      insurance_networks: nothing is written (class names are ar/en only); plan Arabic name `VIP` -> `فئة VIP` is not touched (display only).
 *   2. two display names that were not a name: radiology `HSG` -> `Hysterosalpingography (HSG)` (name_en) and lab `CK-MB`
 *      (name_ar) -> `إنزيم القلب CK-MB`. Renamed only while the stored value is still the old one, so an admin edit is kept.
 * The lab/radiology/nursing/specialties names and descriptions come from 2026-10-services-content.ts: run it with
 * `--force` after this change, because the Filipino names in services-content.v1.json were corrected (same content version).
 *
 * - Dry-run default (prints counts, writes nothing); `--apply` writes. Idempotent ($set of the same values).
 * - Only fields that are empty in the database are filled; an existing translation is never overwritten (`--overwrite` to replace).
 * - NODE_ENV=production is refused unless CONFIRM_CATALOGUE_TRANSLATIONS=yes.
 *
 * Run: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-translations-fill.ts [--apply]
 */
import * as fs from 'fs';
import * as path from 'path';
import { connect, connection } from 'mongoose';

const APPLY = process.argv.includes('--apply');
const OVERWRITE = process.argv.includes('--overwrite');
export const SEED_INSURANCE = path.join(__dirname, '../../src/modules/catalogs/seed-data/insurance.json');
const LOCALES = ['ur', 'hi', 'bn', 'tl'] as const;

type Plan = Record<string, any>;
type Company = Record<string, any> & { code: string; plans: Plan[] };

/** Fields to set on a row: seed value when the stored one is empty (or --overwrite). */
export function fillSet(stored: Record<string, any>, wanted: Record<string, string | undefined>, overwrite = false): Record<string, string> {
  const set: Record<string, string> = {};
  for (const [k, v] of Object.entries(wanted)) {
    if (typeof v !== 'string' || !v.trim()) continue;
    const have = stored[k];
    if (overwrite || typeof have !== 'string' || !have.trim()) set[k] = v;
  }
  return set;
}

export function companyFields(c: Company, withTpaText: boolean): Record<string, string | undefined> {
  const w: Record<string, string | undefined> = {};
  // names stay Arabic and English only (owner, 2026-10-25): only the descriptions are written in the other four languages
  for (const l of LOCALES) w[`description_${l}`] = c[`description_${l}`];
  if (withTpaText) { w.description_ar = c.description_ar; w.description_en = c.description_en; }
  return w;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_CATALOGUE_TRANSLATIONS !== 'yes') {
    throw new Error('refused: NODE_ENV=production needs CONFIRM_CATALOGUE_TRANSLATIONS=yes');
  }
  const seed: Company[] = JSON.parse(fs.readFileSync(SEED_INSURANCE, 'utf8'));
  await connect(process.env.MONGODB_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const report = { companies: { rows: 0, written: 0, missing_in_db: [] as string[] }, networks: { written: 0 }, renamed: [] as string[] };
  const cos = db.collection('insurance_companies');
    for (const c of seed) {
    const row: any = await cos.findOne({ code: c.code });
    if (!row) { report.companies.missing_in_db.push(c.code); continue; }
    report.companies.rows++;
    // A TPA's description text was wrong in the seed ("insurer"); replace it only while it is still the old seed text.
    const oldText = (row.description_en || '') === 'Licensed cooperative health insurer — approved networks and tiers.';
    const set = fillSet(row, companyFields(c, c.kind === 'tpa' && oldText), OVERWRITE || (c.kind === 'tpa' && oldText));
    if (Object.keys(set).length) { report.companies.written++; if (APPLY) await cos.updateOne({ _id: row._id }, { $set: set }); }
  }
  for (const [col, field, from, to] of [
    ['radiology_services', 'name_en', 'HSG', 'Hysterosalpingography (HSG)'],
    ['lab_services', 'name_ar', 'CK-MB', 'إنزيم القلب CK-MB'],
  ] as const) {
    const n = await db.collection(col).countDocuments({ [field]: from });
    if (n) { report.renamed.push(`${col}.${field}: ${n}`); if (APPLY) await db.collection(col).updateMany({ [field]: from }, { $set: { [field]: to } }); }
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
