/**
 * The steps of the production catalogue apply. Each step reads the database and returns CHANGES (see catalogue-apply.core.ts);
 * none of them writes. Order: translations of the medicines (#1844), Arabic/English names of cities and insurers, medicine-name
 * hygiene and the owner-approved name fixes (#1556), districts (item 5), placeholder and duplicate cities deleted (owner decision 2026-10-26).
 */
import { Types } from 'mongoose';
import { CATALOG_COLLECTIONS } from './catalog-collections';
import { afterMove, applyMoves, findMoves, movePaths, storagePath, type MoveItem, type TranslationFile } from '../medicines/content-translation';
import { storedContentText } from '../medicines/med-i18n';
import { publicMedicineFilter } from '../medicines/public-medicine-filter';
import { SAUDI_LOCATIONS_SEED } from '../location/seeds/saudi-locations.data';
import { planImport, type Extract } from '../location/districts-plan';
import { DISTRICT_REFERENCE_FIELDS, getPath, isNumberedDistrict, nearestDistrict, pointOfRecord, type DistrictRow } from '../location/numbered-districts';
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

export interface NumberedDistrictCity {
  city: string; numbered: number; real: number; real_with_centroid: number; referenced: number; repointed: number; cleared: number;
  action: 'deleted' | 'deferred_no_real_district_has_a_centroid_yet';
}
export interface NumberedDistrictReport { numbered_rows: number; deleted_rows: number; cities: NumberedDistrictCity[]; deferred_rows: number; references_repointed: number; references_cleared: number }

/**
 * Step 8 — the numbered placeholder districts (owner ruling 2026-10-26: fake rows are deleted). Per city:
 *  - the city has real districts WITH a centroid: every reference to a numbered district (an address, order, provider, facility or branch
 *    that holds one of its names or code) is re-pointed to the nearest real district by the reference's own point (same language as the
 *    stored value), or its district text is cleared when the record has no point; then the numbered rows are deleted;
 *  - the city has real districts but none has a centroid yet: nothing is done for it (it waits for the districts step, which fills them);
 *  - the city has no real district at all: references are cleared and the numbered rows deleted; the city keeps its centre and shows
 *    without districts until the extract adds real ones.
 * The plan lists the counts per city. Every write is a compare-and-set or a same-_id delete, so a second plan is empty.
 */
export async function planNumberedDistricts(db: DbLike): Promise<{ changes: Change[]; report: NumberedDistrictReport }> {
  const rows = (await db.collection('locations').find({ type: 'district' }, {}).toArray()) as Array<DistrictRow & { _id: unknown }>;
  const byCity = new Map<string, Array<DistrictRow & { _id: unknown }>>();
  for (const r of rows) if (r.parent_code) byCity.set(r.parent_code, [...(byCity.get(r.parent_code) ?? []), r]);
  const changes: Change[] = [];
  const report: NumberedDistrictReport = { numbered_rows: 0, deleted_rows: 0, cities: [], deferred_rows: 0, references_repointed: 0, references_cleared: 0 };

  for (const [city, list] of [...byCity].sort(([a], [b]) => a.localeCompare(b))) {
    const numbered = list.filter(isNumberedDistrict);
    if (!numbered.length) continue;
    report.numbered_rows += numbered.length;
    const real = list.filter((r) => !isNumberedDistrict(r) && r.is_active !== false);
    const withCentroid = real.filter((r) => typeof r.coordinates?.lat === 'number' && typeof r.coordinates?.lng === 'number');
    const entry: NumberedDistrictCity = { city, numbered: numbered.length, real: real.length, real_with_centroid: withCentroid.length, referenced: 0, repointed: 0, cleared: 0, action: 'deleted' };
    if (real.length > 0 && withCentroid.length === 0) {
      entry.action = 'deferred_no_real_district_has_a_centroid_yet';
      report.deferred_rows += numbered.length;
      report.cities.push(entry);
      continue;
    }
    const spellings = new Set(numbered.flatMap((r) => [r.code, r.name_ar, r.name_en].filter((v): v is string => typeof v === 'string' && v.trim() !== '')));
    const spellingList = [...spellings];
    for (const f of DISTRICT_REFERENCE_FIELDS) {
      const field = f.array ? `${f.array}.${f.district}` : f.district;
      const docs = await db.collection(f.collection).find({ [field]: { $in: spellingList } }, {}).toArray();
      for (const d of docs) {
        const targets: Array<{ path: string; stored: string; rec: unknown }> = f.array
          ? ((getPath(d, f.array) as unknown[]) ?? []).flatMap((el, i) => (typeof getPath(el, f.district) === 'string' && spellings.has(getPath(el, f.district) as string) ? [{ path: `${f.array}.${i}.${f.district}`, stored: getPath(el, f.district) as string, rec: el }] : []))
          : typeof getPath(d, f.district) === 'string' && spellings.has(getPath(d, f.district) as string) ? [{ path: f.district, stored: getPath(d, f.district) as string, rec: d }] : [];
        for (const t of targets) {
          entry.referenced += 1;
          const point = pointOfRecord(t.rec, f.points);
          const near = point && withCentroid.length ? nearestDistrict(point, withCentroid) : null;
          const after = near ? (numbered.some((r) => r.code === t.stored) ? near.code : /[\u0600-\u06FF]/.test(t.stored) ? (near.name_ar ?? '') : (near.name_en ?? '')) : '';
          changes.push({ kind: 'set', step: 'numbered_districts', collection: f.collection, key: { _id: d._id }, path: t.path, before: t.stored, after });
          if (near && after) entry.repointed += 1; else entry.cleared += 1;
        }
      }
    }
    for (const r of numbered) {
      changes.push({ kind: 'delete', step: 'numbered_districts', collection: 'locations', key: { code: r.code }, doc: r as unknown as Record<string, unknown> });
      report.deleted_rows += 1;
    }
    report.references_repointed += entry.repointed; report.references_cleared += entry.cleared;
    report.cities.push(entry);
  }
  return { changes, report };
}

export interface ProductTranslationReport {
  items: number; to_write: number; already_translated: number; skipped_not_published: number; skipped_source_changed: number;
  by_locale: Record<string, number>;
  /** Texts in the wrong column (an Arabic text in the English column), fixed as part of the same apply. */
  language_moves?: { items: number; planned: number; skipped_not_published: number; skipped_changed_since_plan: number; by_kind: Record<string, number>; by_field: Record<string, number>; retranslated_in_place: number };
}

/**
 * Step 7 — missing product texts, translated from the existing text by the batch tool (`scripts/translate-product-content.ts`) and
 * reviewed as a file (owner complaint 2026-10-26). Each item becomes a guarded set on an EMPTY field of a published product, and only while
 * the source text is still the one that was translated; a provenance mark (`translation_provenance.<locale>.<field>`) says it is machine
 * translated. Nothing is overwritten, so a second plan is empty.
 *
 * Also the texts in the WRONG column (owner 2026-10-27: fixed, not skipped): the file's `moves`. A text whose letters are in the other of Arabic /
 * English is moved to its own column when that is empty (the wrong column is emptied), or only the wrong column is emptied when the right one already
 * has its text, or the two trade places. Every path is a compare-and-set on the EXACT old value, the moved text is marked `machine_moved`, and a column
 * the move emptied that the file also translates (from the corrected product) is written with the translation in the same set, so the order of the
 * writes cannot matter. A move whose text changed since the dry run is skipped, and a second plan is empty.
 */
export async function planProductTranslations(db: DbLike, file: TranslationFile): Promise<{ changes: Change[]; report: ProductTranslationReport }> {
  const report: ProductTranslationReport = { items: file.items.length, to_write: 0, already_translated: 0, skipped_not_published: 0, skipped_source_changed: 0, by_locale: {} };
  const moveReport = { items: (file.moves ?? []).length, planned: 0, skipped_not_published: 0, skipped_changed_since_plan: 0, by_kind: {} as Record<string, number>, by_field: {} as Record<string, number>, retranslated_in_place: 0 };
  if (file.moves) report.language_moves = moveReport;
  const changes: Change[] = [];
  const ids = [...new Set([...file.items.map((i) => i.id), ...(file.moves ?? []).map((m) => m.id)])];
  const docs = new Map<string, Record<string, any>>();
  for (let s = 0; s < ids.length; s += 500) {
    for (const d of await db.collection(CATALOG_COLLECTIONS.medicines).find({ ...publicMedicineFilter(), id: { $in: ids.slice(s, s + 500) } }, {}).toArray()) docs.set(String(d.id), d);
  }
  const collection = CATALOG_COLLECTIONS.medicines;
  const setAt = new Map<string, SetChange>();          // `${_id}|${path}` → the change, so a translation can fold into a move's empty-out
  const push = (c: SetChange) => { changes.push(c); setAt.set(`${String(c.key._id)}|${c.path}`, c); };

  // 1. the moves: only while the stored text is still the one the dry run saw
  const virtual = new Map<string, Record<string, any>>();
  const moved = new Map<string, MoveItem[]>();
  for (const m of file.moves ?? []) {
    const doc = docs.get(m.id);
    if (!doc) { moveReport.skipped_not_published += 1; continue; }
    const current = findMoves(doc).find((x) => x.field === m.field && x.wrong === m.wrong && x.kind === m.kind && x.text_sha === m.text_sha);
    if (!current) { moveReport.skipped_changed_since_plan += 1; continue; }
    moved.set(m.id, [...(moved.get(m.id) ?? []), current]);
  }
  for (const [id, list] of moved) {
    const doc = docs.get(id) as Record<string, any>;
    virtual.set(id, applyMoves(doc, list));
    const key = { _id: doc._id };
    for (const m of list) {
      const after = afterMove(doc, m);
      for (const p of movePaths(doc, m, after)) push({ kind: 'set', step: 'language_moves', collection, key, path: p.path, before: p.before, after: p.after });
      // the column that received a text is marked as moved by a machine; a swap marks both
      for (const locale of ['ar', 'en'] as const) {
        const received = m.kind === 'swap' || locale === m.right;
        if (received && after[locale] !== null && m.kind !== 'clear') {
          push({ kind: 'set', step: 'language_moves', collection, key, path: `translation_provenance.${locale}.${m.field}`, before: null, after: 'machine_moved' });
        }
      }
      moveReport.planned += 1;
      moveReport.by_kind[m.kind] = (moveReport.by_kind[m.kind] ?? 0) + 1;
      moveReport.by_field[m.field] = (moveReport.by_field[m.field] ?? 0) + 1;
    }
  }

  // 2. the translations, planned against the product as it will be after the moves
  for (const item of file.items) {
    const doc = docs.get(item.id);
    if (!doc) { report.skipped_not_published += 1; continue; }
    const view = virtual.get(item.id) ?? doc;
    if (storedContentText(view, item.field, item.target) !== null) { report.already_translated += 1; continue; }
    const source = storedContentText(view, item.field, item.source);
    if (source === null || sha256(source) !== item.source_sha) { report.skipped_source_changed += 1; continue; }
    const key = { _id: doc._id };
    const path = storagePath(item.field, item.target);
    const folded = setAt.get(`${String(doc._id)}|${path}`);
    if (folded && folded.after === '') { folded.after = item.text; moveReport.retranslated_in_place += 1; }
    else push({ kind: 'set', step: 'product_translations', collection, key, path, before: null, after: item.text });
    const mark = `translation_provenance.${item.target}.${item.field}`;
    const markedByMove = setAt.get(`${String(doc._id)}|${mark}`);
    if (markedByMove) markedByMove.after = `machine:${file.model}`;
    else push({ kind: 'set', step: 'product_translations', collection, key, path: mark, before: null, after: `machine:${file.model}` });
    report.to_write += 1;
    report.by_locale[item.target] = (report.by_locale[item.target] ?? 0) + 1;
  }
  return { changes, report };
}

/**
 * Step 9 — the patient's saved insurance class under both names (QA P1: one writer, one shape). Policies saved by `POST /insurance/save-policy`
 * before the single writer have only `plan_class`; ones saved by `/users/me/insurance` have only `class`. Readers of `class` (the broadcast tier,
 * the coverage check) saw none on the first kind. Each missing name is set from the other, never overwriting anything.
 */
export async function planInsuranceShape(db: DbLike): Promise<{ changes: Change[]; report: { policies_checked: number; class_added: number; plan_class_added: number } }> {
  const rows = await db.collection('patient_profiles').find({ insurance: { $type: 'object' } }, { projection: { _id: 1, 'insurance.class': 1, 'insurance.plan_class': 1 } }).toArray();
  const changes: Change[] = [];
  const report = { policies_checked: rows.length, class_added: 0, plan_class_added: 0 };
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  for (const r of rows) {
    const cls = text(r.insurance?.class); const plan = text(r.insurance?.plan_class);
    if (plan && !cls) { changes.push({ kind: 'set', step: 'insurance_shape', collection: 'patient_profiles', key: { _id: r._id }, path: 'insurance.class', before: null, after: plan }); report.class_added += 1; }
    else if (cls && !plan) { changes.push({ kind: 'set', step: 'insurance_shape', collection: 'patient_profiles', key: { _id: r._id }, path: 'insurance.plan_class', before: null, after: cls }); report.plan_class_added += 1; }
  }
  return { changes, report };
}

/**
 * Step 10 — the radiology catalogue patients see (owner, 2026-10-28: "radiology must show all scans"). Production holds 49 catalogue rows and the patient list
 * (`GET /radiology/services`) shows 23, because it shows only rows that are active, public AND medically approved. The other 26 are:
 *   - 14 LEGACY duplicates of a visible scan under an old short code (CXR = XR_CHEST ...), pending and not public: they stay hidden, and are marked deleted
 *     (`is_deleted`, `merged_into` the visible code) so they stop being counted as missing. A booking that points at one still resolves.
 *   - 7 scans that exist only as a pending row (ECHO, MAMMO, DEXA, HSG, PANOREX, BARIUM, PETCT): approving a scan is a medical sign-off, so they become visible
 *     ONLY when the reviewed file (`--radiology-approve=<file>`, `{"approve":["MAMMO",...]}`) lists their code; the oldest pending row of the code is the one approved.
 *   - 5 extra rows of those codes with no flags at all (a second insert): marked deleted, the kept row stays.
 * Every write is a compare-and-set on the exact current value, so a row an admin has touched since the dry run is left alone.
 */
export const LEGACY_RADIOLOGY_CODES: Readonly<Record<string, string>> = {
  CXR: 'XR_CHEST', AXR: 'XR_ABDOMEN', KXR: 'XR_KNEE', SXR: 'XR_SPINE', MRIB: 'MRI_BRAIN', MRIK: 'MRI_KNEE', MRIS: 'MRI_LSPINE',
  CTB: 'CT_BRAIN', CTC: 'CT_CHEST', CTAP: 'CT_ABDOMEN', USA: 'US_ABDOMEN', USP: 'US_PELVIS_TV', UST: 'US_THYROID', USPR: 'US_PREG',
};

export interface RadiologyCatalogueReport {
  rows: number; visible: number; legacy_duplicates_hidden: number; extra_rows_hidden: number;
  /** codes with only a pending row: they wait for the reviewed file */
  awaiting_approval: string[]; approved_by_file: string[]; file_codes_not_found: string[];
  /** the reviewed file's `merge` ({from: to}) and `delete` entries: rows of those codes are marked, then deleted by the hidden-delete pass when nothing names them */
  merged_by_file: string[]; removed_by_file: string[]; merge_target_not_visible: string[];
}

export interface RadiologyFileExtras { merge?: Record<string, string>; remove?: string[] }

export async function planRadiologyCatalogue(db: DbLike, approve: string[] = [], extras: RadiologyFileExtras = {}): Promise<{ changes: Change[]; report: RadiologyCatalogueReport }> {
  const coll = CATALOG_COLLECTIONS.radiology_services;
  const rows: any[] = await db.collection(coll).find({}, { projection: { _id: 1, short_code: 1, code: 1, active: 1, is_deleted: 1, public_eligibility: 1, medical_review_status: 1, createdAt: 1 } }).toArray();
  const codeOf = (r: any) => String(r.short_code || r.code || '');
  const live = (r: any) => r.is_deleted !== true;
  const visibleRow = (r: any) => live(r) && r.active !== false && r.public_eligibility === true && r.medical_review_status === 'approved';
  const created = (r: any) => { const t = r.createdAt instanceof Date ? r.createdAt.getTime() : Date.parse(String(r.createdAt ?? '')); return Number.isFinite(t) ? t : (r._id?.getTimestamp?.().getTime?.() ?? 0); };
  const byCode = new Map<string, any[]>();
  for (const r of rows) { const c = codeOf(r); if (c) byCode.set(c, [...(byCode.get(c) ?? []), r]); }
  const changes: Change[] = [];
  const report: RadiologyCatalogueReport = { rows: rows.length, visible: rows.filter(visibleRow).length, legacy_duplicates_hidden: 0, extra_rows_hidden: 0, awaiting_approval: [], approved_by_file: [], file_codes_not_found: [], merged_by_file: [], removed_by_file: [], merge_target_not_visible: [] };
  const hide = (r: any, into: string) => {
    changes.push({ kind: 'set', step: 'radiology_catalogue', collection: coll, key: { _id: r._id }, path: 'is_deleted', before: r.is_deleted === undefined ? null : r.is_deleted, after: true });
    changes.push({ kind: 'set', step: 'radiology_catalogue', collection: coll, key: { _id: r._id }, path: 'merged_into', before: null, after: into });
  };
  const approveSet = new Set(approve.map((c) => c.trim()).filter(Boolean));
  for (const [code, group] of byCode) {
    const alive = group.filter(live);
    const canonical = LEGACY_RADIOLOGY_CODES[code];
    if (canonical) {
      // a legacy code is hidden only while its canonical scan is really visible and the legacy row itself is not
      if (!(byCode.get(canonical) ?? []).some(visibleRow)) continue;
      for (const r of alive) if (!visibleRow(r)) { hide(r, canonical); report.legacy_duplicates_hidden += 1; }
      continue;
    }
    if (alive.some(visibleRow)) continue;
    const pending = alive.filter((r) => r.public_eligibility !== true || r.medical_review_status !== 'approved');
    if (!pending.length) continue;
    // the kept row: the oldest one that carries the pending review state, else the oldest
    const flagged = pending.filter((r) => r.medical_review_status === 'pending');
    const keeper = [...(flagged.length ? flagged : pending)].sort((a, b) => created(a) - created(b) || String(a._id).localeCompare(String(b._id)))[0];
    for (const r of alive) if (r !== keeper && r.public_eligibility === undefined && r.medical_review_status === undefined) { hide(r, code); report.extra_rows_hidden += 1; }
    if (approveSet.has(code)) {
      const set = (path: string, before: unknown, after: unknown) => changes.push({ kind: 'set', step: 'radiology_catalogue', collection: coll, key: { _id: keeper._id }, path, before, after });
      set('public_eligibility', keeper.public_eligibility === undefined ? null : keeper.public_eligibility, true);
      set('medical_review_status', keeper.medical_review_status === undefined ? null : keeper.medical_review_status, 'approved');
      if (keeper.active === false) set('active', false, true);
      report.approved_by_file.push(code);
    } else report.awaiting_approval.push(code);
  }
  // the reviewed file's merges and deletions (owner decision: no hidden rows; a duplicate is merged into the kept code, a wrong row is removed)
  const marked = new Set(changes.filter((c) => c.kind === 'set' && c.path === 'is_deleted').map((c) => String((c as SetChange).key._id)));
  const willBeVisible = (code: string) => (byCode.get(code) ?? []).some(visibleRow) || approveSet.has(code);
  for (const [from, to] of Object.entries(extras.merge ?? {})) {
    const rows = (byCode.get(from) ?? []).filter((r) => live(r) && !visibleRow(r) && !marked.has(String(r._id)));
    if (!byCode.has(from)) { report.file_codes_not_found.push(from); continue; }
    if (!willBeVisible(to)) { report.merge_target_not_visible.push(`${from}->${to}`); continue; }
    for (const r of rows) { hide(r, to); marked.add(String(r._id)); }
    if (rows.length) report.merged_by_file.push(`${from}->${to}`);
  }
  for (const code of extras.remove ?? []) {
    if (!byCode.has(code)) { report.file_codes_not_found.push(code); continue; }
    const rows = (byCode.get(code) ?? []).filter((r) => live(r) && !visibleRow(r) && !marked.has(String(r._id)));
    for (const r of rows) { changes.push({ kind: 'set', step: 'radiology_catalogue', collection: coll, key: { _id: r._id }, path: 'is_deleted', before: r.is_deleted === undefined ? null : r.is_deleted, after: true }); marked.add(String(r._id)); }
    if (rows.length) report.removed_by_file.push(code);
  }
  for (const c of approveSet) if (!byCode.has(c)) report.file_codes_not_found.push(c);
  report.awaiting_approval = report.awaiting_approval.filter((c) => !report.removed_by_file.includes(c) && !report.merged_by_file.some((m) => m.startsWith(`${c}->`)));
  report.awaiting_approval.sort(); report.approved_by_file.sort(); report.file_codes_not_found.sort(); report.merged_by_file.sort(); report.removed_by_file.sort(); report.merge_target_not_visible.sort();
  return { changes, report };
}
