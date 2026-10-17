/**
 * #1556 owner decision F (2026-10-16): insurers only from official sources, with a source URL per row.
 * Data: src/modules/catalogs/content/insurance-official.v1.json, read from the Insurance Authority's list of licensed
 * companies (PDF dated 14 Oct 2026, https://www.ia.gov.sa/ar/licenses).
 *
 * For every listed company that the catalogue already holds (by `seed_code` = insurance_companies.code) it records the
 * licence number, unified number, expiry, whether the licence covers health insurance, and the source URL.
 * It never invents a class: no network/class is written (none is published officially; see `for_owner`).
 * Catalogue companies that are not on the official list are reported, not changed (the owner decides).
 *
 * - Dry-run default; `--apply` writes. Idempotent.
 * - NODE_ENV=production is refused unless CONFIRM_INSURANCE_OFFICIAL=yes.
 *
 * Run: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-insurance-official.ts [--apply]
 */
import * as fs from 'fs';
import * as path from 'path';
import { connect, connection } from 'mongoose';

const APPLY = process.argv.includes('--apply');
export const DATA_FILE = path.join(__dirname, '../../src/modules/catalogs/content/insurance-official.v1.json');

type Row = { licence_no: string; unified_no: string; licence_expiry: string; health_insurance_licensed: boolean; entity_type: string; name_ar: string; name_en: string; seed_code: string | null; source_url: string };

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_INSURANCE_OFFICIAL !== 'yes') {
    throw new Error('refused: NODE_ENV=production needs CONFIRM_INSURANCE_OFFICIAL=yes');
  }
  const data: { companies: Row[] } = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  await connect(process.env.MONGODB_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const col = db.collection('insurance_companies');
  const rows = await col.find({}).toArray();
  const recorded: unknown[] = [];
  const notInCatalogue: string[] = [];
  for (const c of data.companies) {
    const hit = c.seed_code ? rows.find((r) => r.code === c.seed_code) : undefined;
    if (!hit) {
      notInCatalogue.push(c.name_en);
      continue;
    }
    recorded.push({ code: hit.code, licence_no: c.licence_no, health: c.health_insurance_licensed });
    if (APPLY) {
      await col.updateOne({ _id: hit._id }, { $set: {
        regulatory_source_url: c.source_url, licence_no: c.licence_no, unified_no: c.unified_no, licence_expiry: c.licence_expiry,
        health_insurance_licensed: c.health_insurance_licensed, official_name_ar: c.name_ar,
      } });
    }
  }
  const listed = new Set(data.companies.map((c) => c.seed_code).filter(Boolean));
  const notOnOfficialList = rows.filter((r) => !listed.has(r.code)).map((r) => String(r.code));
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', recorded, official_not_in_catalogue: notInCatalogue, catalogue_not_on_official_list: notOnOfficialList }));
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
