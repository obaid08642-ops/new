/**
 * The steps of the production catalogue apply. Each step reads the database and returns CHANGES (see catalogue-apply.core.ts);
 * none of them writes. Order: translations of the medicines (#1844), Arabic/English names of cities and insurers, medicine-name
 * hygiene and the owner-approved name fixes (#1556), districts (item 5), placeholder and duplicate cities deleted (owner decision 2026-10-26).
 */
import { Types } from 'mongoose';
import { CATALOG_COLLECTIONS } from './catalog-collections';
import { storagePath, type TranslationFile } from '../medicines/content-translation';
import { storedContentText } from '../medicines/med-i18n';
import { publicMedicineFilter } from '../medicines/public-medicine-filter';
import { SAUDI_LOCATIONS_SEED } from '../location/seeds/saudi-locations.data';
import { planImport, type Extract } from '../location/districts-plan';
import { CITY_REFERENCE_FIELDS, DELETE_CITY_RULES, LISTED_ONLY_CITY_CODES, REGION_DEFAULT_CITY, spellingsOf, withDistricts, type LocationRow } from '../location/placeholder-cities';
import { FillChange, loadTranslations, planFill } from '../medicines/medicine-translation-fill';
import { applyApproved, parseCsv, type AuditCollection, type UpdateCollection } from '../../scripts/fix-catalogue-names';
import insuranceSeed from './seed-data/insurance.json';
import { sha256, type Change, type DbLike, type SetChange } from './catalogue-apply.core';

const blank = (v: unknown) => typeof v !== 'string' || v.trim() === '';

/** Step 1 — medicine name translations (#1844): the reviewed CSV; a non-English value is never overwritten (the planner's rule). */
export async function planMedicineTranslations(db: DbLike, csvText: string): Promise<Change[]> {
  const rows = await db.collection('medicines').find({ is_deleted: { $ne: true } }, { projection: { _id: 0, id: 1, name_en: 1, is_deleted: 1, translations: 1 } }).toArray();
  const map = loadTranslations(csvText);
  return planFill(rows, map).map((c: FillChange): SetChange => ({ kind: 'set', step: 'medicine_translations', collection: 'medicines', key: { id: c.id }, path: c.path, before: c.before, after: c.after }));
}

/**
 * Step 2 — Arabic and English names of the regions, cities and insurers (owner decision 2026-10-25: two languages only). Fills
 * `name_ar` / `name_en` only where the stored value is empty, from the central seed; nothing is overwritten and no other language is written.
 */
export async function planNamesArEn(db: DbLike): Promise<Change[]> {
  const out: Change[] = [];
  const locations = await db.collection('locations').find({ type: { $in: ['country', 'region', 'city'] } }, { projection: { _id: 0, code: 1, name_ar: 1, name_en: 1 } }).toArray();
  const seed = new Map(SAUDI_LOCATIONS_SEED.map((l) => [l.code, l]));
  for (const row of locations) {
    const s = seed.get(row.code);
    if (!s) continue;
    for (const f of ['name_ar', 'name_en'] as const) if (blank(row[f]) && !blank(s[f])) out.push({ kind: 'set', step: 'names_ar_en', collection: 'locations', key: { code: row.code }, path: f, before: row[f] ?? null, after: s[f] });
  }
  const companies = await db.collection('insurance_companies').find({}, { projection: { _id: 0, code: 1, name_ar: 1, name_en: 1 } }).toArray();
  const insurers = new Map((insuranceSeed as Array<{ code: string; name_ar?: string; name_en?: string }>).map((c) => [c.code, c]));
  for (const row of companies) {
    const s = insurers.get(row.code);
    if (!s) continue;
    for (const f of ['name_ar', 'name_en'] as const) if (blank(row[f]) && !blank(s[f])) out.push({ kind: 'set', step: 'names_ar_en', collection: 'insurance_companies', key: { code: row.code }, path: f, before: row[f] ?? null, after: s[f] });
  }
  return out;
}

/** Collapses runs of whitespace and trims; only when that changes the text (it never changes a letter). */
export const tidy = (v: string): string => v.replace(/[\s ]+/g, ' ').trim();

/** Step 3 — medicine-name hygiene (#1556): leading/trailing/double spaces in `name_ar` / `name_en`. Everything else is report-only. */
export async function planMedicineNameHygiene(db: DbLike): Promise<{ changes: Change[]; report: Record<string, number> }> {
  const rows = await db.collection('medicines').find({ is_deleted: { $ne: true } }, { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1 } }).toArray();
  const changes: Change[] = [];
  const report: Record<string, number> = { medicines: rows.length, missing_name_ar: 0, missing_name_en: 0, same_ar_and_en: 0 };
  for (const r of rows) {
    if (blank(r.name_ar)) report.missing_name_ar += 1;
    if (blank(r.name_en)) report.missing_name_en += 1;
    if (!blank(r.name_ar) && r.name_ar === r.name_en) report.same_ar_and_en += 1;
    for (const f of ['name_ar', 'name_en'] as const) {
      if (typeof r[f] !== 'string') continue;
      const fixed = tidy(r[f]);
      if (fixed && fixed !== r[f]) changes.push({ kind: 'set', step: 'medicine_name_hygiene', collection: 'medicines', key: { id: r.id }, path: f, before: r[f], after: fixed });
    }
  }
  return { changes, report };
}

/**
 * Step 4 — the owner-approved Arabic name fixes (#1556 decision A): the rows of `approved.csv` marked approved=yes, run through the
 * script's own checks (Arabic fields only, brand rules, never shortened) without touching the database. Each becomes a guarded set.
 */
export async function planNameFixes(db: DbLike, csvText: string): Promise<{ changes: Change[]; approved: number; refused: number; already_applied_or_changed: number }> {
  const rows = parseCsv(csvText);
  const seen: Array<{ id: string; field: string; before: string; after: string }> = [];
  const recorder: UpdateCollection = {
    async updateOne(filter, update) {
      const field = Object.keys(filter).find((k) => k !== '_id') as string;
      seen.push({ id: String((filter as any)._id), field, before: String((filter as any)[field]), after: String((update as any).$set[field]) });
      return { modifiedCount: 1 };
    },
  };
  const audit: AuditCollection = { async insertOne() { return undefined; } };
  const res = await applyApproved(rows, (id) => id, recorder, audit, 'plan');
  const all: Change[] = seen.map((s) => ({ kind: 'set', step: 'medicine_name_fixes', collection: 'medicines', key: /^[0-9a-f]{24}$/i.test(s.id) ? { _id: new Types.ObjectId(s.id) } : { _id: s.id }, path: s.field, before: s.before, after: s.after }));
  // only the rows whose stored value is still the `before` of the approved file: an applied or edited one drops out, so a second plan is empty
  const changes: Change[] = [];
  for (const c of all) {
    if (c.kind !== 'set') continue;
    const [doc] = await db.collection(c.collection).find(c.key, { projection: { [c.path]: 1 } }).toArray();
    const stored = doc ? String(doc[c.path] ?? '') : null;
    if (stored === String(c.before)) changes.push(c);
  }
  return { changes, approved: res.approved, refused: res.refused.length, already_applied_or_changed: all.length - changes.length };
}

/** Step 5 — districts (item 5): centroids for the ones that exist, new rows for the rest, from the extract (every row names its source). */
export async function planDistricts(db: DbLike, extract: Extract): Promise<{ changes: Change[]; perCity: ReturnType<typeof planImport>['perCity']; rejected: number; newCities: number }> {
  const existing = await db.collection('locations').find({ type: { $in: ['region', 'city', 'district'] } }, { projection: { _id: 0, code: 1, name_ar: 1, name_en: 1, type: 1, parent_code: 1, coordinates: 1 } }).toArray();
  const plan = planImport(existing as any, extract);
  const changes: Change[] = [];
  for (const f of plan.cityFills) {
    changes.push({ kind: 'set', step: 'districts', collection: 'locations', key: { code: f.code, type: 'city' }, path: 'coordinates', before: null, after: { lat: f.lat, lng: f.lng } });
    changes.push({ kind: 'set', step: 'districts', collection: 'locations', key: { code: f.code, type: 'city' }, path: 'source', before: null, after: f.source });
  }
  for (const f of plan.fills) {
    changes.push({ kind: 'set', step: 'districts', collection: 'locations', key: { code: f.code, type: 'district' }, path: 'coordinates', before: null, after: { lat: f.lat, lng: f.lng } });
    changes.push({ kind: 'set', step: 'districts', collection: 'locations', key: { code: f.code, type: 'district' }, path: 'source', before: null, after: f.source });
  }
  // new cities first, so the districts under them have a parent
  for (const n of plan.newCities) {
    changes.push({ kind: 'insert', step: 'districts', collection: 'locations', doc: {
      code: n.code, name_ar: n.name_ar, name_en: n.name_en, type: 'city', parent_code: n.region_code, aliases: [], coordinates: { lat: n.lat, lng: n.lng },
      coverage: { pharmacy_delivery: true, home_healthcare: true, lab_collection: true }, is_active: true, source: n.source,
    } });
  }
  for (const i of plan.inserts) {
    changes.push({ kind: 'insert', step: 'districts', collection: 'locations', doc: {
      code: i.code, name_ar: i.name_ar, name_en: i.name_en, type: 'district', parent_code: i.city_code, aliases: [], coordinates: { lat: i.lat, lng: i.lng },
      coverage: { pharmacy_delivery: true, home_healthcare: true, lab_collection: true }, is_active: true, source: i.source,
    } });
  }
  return { changes, perCity: plan.perCity, rejected: plan.rejected.length, newCities: plan.newCities.length };
}

export interface PlaceholderCityReport {
  /** city to delete -> documents that hold one of its spellings, per collection (only non-zero) */
  references: Record<string, Record<string, number>>;
  deleted_cities: string[];
  deleted_rows: number;
  repointed: Array<{ code: string; into: string; rewritten_references: number; how: 'real_counterpart' | 'region_default' }>;
  listed_only: string[];
  missing_in_database: string[];
}

/** Documents that hold one of `spellings` as a city, per reference field. */
async function countReferences(db: DbLike, spellings: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const f of CITY_REFERENCE_FIELDS) {
    const field = f.array ? `${f.path}.city` : f.path;
    const n = await db.collection(f.collection).countDocuments({ [field]: { $in: spellings } });
    if (n > 0) out[`${f.collection}.${field}`] = n;
  }
  return out;
}

/** The spelling of `to` in the same form as the stored value `from` (code, English or Arabic). */
const sameForm = (stored: string, from: LocationRow, to: LocationRow): string => (stored === from.code ? to.code : stored === from.name_en ? (to.name_en as string) : (to.name_ar as string));

/**
 * Step 6 — placeholder and duplicate cities (owner decision 2026-10-26: deleted, not hidden). For each row of DELETE_CITY_RULES:
 *  1. every reference (a city written as text) is re-pointed to the real city of the rule (same language as the stored value);
 *  2. the city and its districts are deleted, each only while it is still the document the plan saw (before-image kept in the backup).
 * A row with no real counterpart that something still references is re-pointed to the main city of its region and listed (`region_default`).
 * Sudair and Yanbu Al Nakhal are only listed.
 */
export async function planPlaceholderCities(db: DbLike): Promise<{ changes: Change[]; report: PlaceholderCityReport }> {
  const codes = DELETE_CITY_RULES.map((r) => r.code);
  const all = (await db.collection('locations').find({ $or: [{ code: { $in: [...codes, ...LISTED_ONLY_CITY_CODES, ...DELETE_CITY_RULES.flatMap((r) => (r.into ? [r.into] : [])), ...Object.values(REGION_DEFAULT_CITY)] } }, { parent_code: { $in: codes } }] }, {}).toArray()) as Array<LocationRow & { _id: unknown }>;
  const byCode = new Map(all.map((r) => [r.code, r]));
  const changes: Change[] = [];
  const report: PlaceholderCityReport = { references: {}, deleted_cities: [], deleted_rows: 0, repointed: [], listed_only: [], missing_in_database: [] };

  for (const rule of DELETE_CITY_RULES) {
    const city = byCode.get(rule.code);
    if (!city) { report.missing_in_database.push(rule.code); continue; }
    const spellings = spellingsOf(city);
    const refs = await countReferences(db, spellings);
    if (Object.keys(refs).length) report.references[rule.code] = refs;
    const hasRefs = Object.keys(refs).length > 0;
    const target = rule.into ? byCode.get(rule.into) : hasRefs ? byCode.get(REGION_DEFAULT_CITY[city.parent_code ?? ''] ?? '') : undefined;
    if (hasRefs && !target) throw new Error(`cannot re-point the references of ${rule.code}: no target city in the database`);
    if (target) {
      let rewritten = 0;
      for (const f of CITY_REFERENCE_FIELDS) {
        const field = f.array ? `${f.path}.city` : f.path;
        const docs = await db.collection(f.collection).find({ [field]: { $in: spellings } }, { projection: { _id: 1, [f.path]: 1 } }).toArray();
        for (const d of docs) {
          if (f.array) {
            (d[f.path] as Array<{ city?: unknown }> | undefined)?.forEach((a, i) => {
              if (typeof a?.city === 'string' && spellings.includes(a.city)) { changes.push({ kind: 'set', step: 'placeholder_cities', collection: f.collection, key: { _id: d._id }, path: `${f.path}.${i}.city`, before: a.city, after: sameForm(a.city, city, target) }); rewritten += 1; }
            });
          } else {
            const stored = f.path.split('.').reduce<any>((v, k) => v?.[k], d);
            if (typeof stored === 'string' && spellings.includes(stored)) { changes.push({ kind: 'set', step: 'placeholder_cities', collection: f.collection, key: { _id: d._id }, path: f.path, before: stored, after: sameForm(stored, city, target) }); rewritten += 1; }
          }
        }
      }
      report.repointed.push({ code: rule.code, into: target.code, rewritten_references: rewritten, how: rule.into ? 'real_counterpart' : 'region_default' });
    }
    for (const row of all.filter((r) => r.code === rule.code || r.parent_code === rule.code)) {
      changes.push({ kind: 'delete', step: 'placeholder_cities', collection: 'locations', key: { code: row.code }, doc: row as unknown as Record<string, unknown> });
      report.deleted_rows += 1;
    }
    report.deleted_cities.push(rule.code);
  }
  for (const code of LISTED_ONLY_CITY_CODES) { if (byCode.has(code)) report.listed_only.push(code); else report.missing_in_database.push(code); }
  return { changes, report };
}

export interface ProductTranslationReport {
  items: number; to_write: number; already_translated: number; skipped_not_published: number; skipped_source_changed: number;
  by_locale: Record<string, number>;
}

/**
 * Step 7 — missing product texts, translated from the existing text by the batch tool (`scripts/translate-product-content.ts`) and
 * reviewed as a file (owner complaint 2026-10-26). Each item becomes a guarded set on an EMPTY field of a published product, and only while
 * the source text is still the one that was translated; a provenance mark (`translation_provenance.<locale>.<field>`) says it is machine
 * translated. Nothing is overwritten, so a second plan is empty.
 */
export async function planProductTranslations(db: DbLike, file: TranslationFile): Promise<{ changes: Change[]; report: ProductTranslationReport }> {
  const report: ProductTranslationReport = { items: file.items.length, to_write: 0, already_translated: 0, skipped_not_published: 0, skipped_source_changed: 0, by_locale: {} };
  const changes: Change[] = [];
  const ids = [...new Set(file.items.map((i) => i.id))];
  const docs = new Map<string, Record<string, any>>();
  for (let s = 0; s < ids.length; s += 500) {
    for (const d of await db.collection(CATALOG_COLLECTIONS.medicines).find({ ...publicMedicineFilter(), id: { $in: ids.slice(s, s + 500) } }, {}).toArray()) docs.set(String(d.id), d);
  }
  for (const item of file.items) {
    const doc = docs.get(item.id);
    if (!doc) { report.skipped_not_published += 1; continue; }
    if (storedContentText(doc, item.field, item.target) !== null) { report.already_translated += 1; continue; }
    const source = storedContentText(doc, item.field, item.source);
    if (source === null || sha256(source) !== item.source_sha) { report.skipped_source_changed += 1; continue; }
    const key = { _id: doc._id };
    changes.push({ kind: 'set', step: 'product_translations', collection: CATALOG_COLLECTIONS.medicines, key, path: storagePath(item.field, item.target), before: null, after: item.text });
    changes.push({ kind: 'set', step: 'product_translations', collection: CATALOG_COLLECTIONS.medicines, key, path: `translation_provenance.${item.target}.${item.field}`, before: null, after: `machine:${file.model}` });
    report.to_write += 1;
    report.by_locale[item.target] = (report.by_locale[item.target] ?? 0) + 1;
  }
  return { changes, report };
}
