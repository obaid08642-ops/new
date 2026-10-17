/**
 * #1556 owner decision F (2026-10-16): fix the insurance networks whose company_id names no insurance company
 * (production audit 2026-10-16: 59 of 357).
 *
 * A network is attached to a company only on evidence stored in the data, never by guess:
 *   1. its company_id is a merged-away company (archive_insurance_companies.merged_into, from the dedupe script);
 *   2. its company_id equals a company's code or _id;
 *   3. its own company_code / company_name / company_name_ar / company_name_en / provider field names exactly one
 *      company (normalized Arabic/English name or code);
 *   4. its code or id starts with exactly one company's code followed by "-" or "_" (e.g. "bupa-gold").
 * Anything else is listed under `for_owner` (network id, name, the missing company_id) and left unchanged.
 *
 * - Dry-run default; `--apply` writes. Idempotent (an attached network is no longer an orphan).
 * - NODE_ENV=production is refused unless CONFIRM_ORPHAN_NETWORKS=yes.
 *
 * Run: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-insurance-orphan-networks.ts [--apply]
 */
import { connect, connection } from 'mongoose';
import { CatalogDoc, nameAr, nameEn, normalizeName } from '../../src/modules/catalogs/catalog-dedupe';

const APPLY = process.argv.includes('--apply');

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function resolveCompany(net: CatalogDoc, companies: CatalogDoc[], mergedInto: Map<string, string>): { id: string; by: string } | null {
  const ids = new Set(companies.map((c) => str(c.id)));
  const cid = str(net.company_id);
  const merged = mergedInto.get(cid);
  if (merged && ids.has(merged)) return { id: merged, by: 'merged_company' };
  const byCodeOrOid = companies.filter((c) => cid && (str(c.code) === cid || String(c._id) === cid));
  if (byCodeOrOid.length === 1) return { id: str(byCodeOrOid[0].id), by: 'company_code_or_oid' };
  for (const f of ['company_code', 'company_name', 'company_name_ar', 'company_name_en', 'provider']) {
    const key = normalizeName(net[f]);
    if (!key) continue;
    const hits = companies.filter((c) => [normalizeName(c.code), normalizeName(nameAr(c)), normalizeName(nameEn(c))].includes(key));
    if (hits.length === 1) return { id: str(hits[0].id), by: f };
  }
  for (const f of ['code', 'id']) {
    const v = str(net[f]).toLowerCase();
    const hits = companies.filter((c) => {
      const code = str(c.code).toLowerCase();
      return code && (v.startsWith(`${code}-`) || v.startsWith(`${code}_`));
    });
    if (hits.length === 1) return { id: str(hits[0].id), by: `${f}_prefix` };
  }
  return null;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_ORPHAN_NETWORKS !== 'yes') {
    throw new Error('refused: NODE_ENV=production needs CONFIRM_ORPHAN_NETWORKS=yes');
  }
  await connect(process.env.MONGODB_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const companies = (await db.collection('insurance_companies').find({}).toArray()) as unknown as CatalogDoc[];
  const ids = new Set(companies.map((c) => str(c.id)));
  const mergedInto = new Map<string, string>();
  for (const a of await db.collection('archive_insurance_companies').find({ merged_into: { $exists: true } }).toArray()) {
    if (str(a.id)) mergedInto.set(str(a.id), str(a.merged_into));
  }
  const nets = db.collection('insurance_networks');
  const orphans = (await nets.find({}).toArray()).filter((n) => !ids.has(str(n.company_id))) as unknown as CatalogDoc[];
  const attached: unknown[] = [];
  const forOwner: unknown[] = [];
  for (const n of orphans) {
    const hit = resolveCompany(n, companies, mergedInto);
    const row = { network: n.id ?? String(n._id), name_ar: nameAr(n), name_en: nameEn(n), missing_company_id: n.company_id ?? null };
    if (!hit) {
      forOwner.push(row);
      continue;
    }
    attached.push({ ...row, company_id: hit.id, matched_by: hit.by });
    if (APPLY) await nets.updateOne({ _id: n._id } as never, { $set: { company_id: hit.id, orphan_fixed_from: n.company_id ?? null, orphan_fixed_by: hit.by } });
  }
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', networks: await nets.countDocuments(), orphans: orphans.length, attached, for_owner: forOwner }));
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
