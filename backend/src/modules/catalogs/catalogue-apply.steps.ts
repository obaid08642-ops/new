/**
 * The steps of the production catalogue apply. Each step reads the database and returns CHANGES (see catalogue-apply.core.ts);
 * none of them writes. Order: translations of the medicines (#1844), Arabic/English names of cities and insurers, medicine-name
 * hygiene and the owner-approved name fixes (#1556), districts (item 5).
 */
import { Types } from 'mongoose';
import { SAUDI_LOCATIONS_SEED } from '../location/seeds/saudi-locations.data';
import { planImport, type Extract } from '../location/districts-plan';
import { FillChange, loadTranslations, planFill } from '../medicines/medicine-translation-fill';
import { applyApproved, parseCsv, type AuditCollection, type UpdateCollection } from '../../scripts/fix-catalogue-names';
import insuranceSeed from './seed-data/insurance.json';
import type { Change, DbLike, SetChange } from './catalogue-apply.core';

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
export async function planDistricts(db: DbLike, extract: Extract): Promise<{ changes: Change[]; perCity: ReturnType<typeof planImport>['perCity']; rejected: number }> {
  const existing = await db.collection('locations').find({ type: { $in: ['city', 'district'] } }, { projection: { _id: 0, code: 1, name_ar: 1, name_en: 1, type: 1, parent_code: 1, coordinates: 1 } }).toArray();
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
  for (const i of plan.inserts) {
    changes.push({ kind: 'insert', step: 'districts', collection: 'locations', doc: {
      code: i.code, name_ar: i.name_ar, name_en: i.name_en, type: 'district', parent_code: i.city_code, aliases: [], coordinates: { lat: i.lat, lng: i.lng },
      coverage: { pharmacy_delivery: true, home_healthcare: true, lab_collection: true }, is_active: true, source: i.source,
    } });
  }
  return { changes, perCity: plan.perCity, rejected: plan.rejected.length };
}
