/**
 * Step 12 of the catalogue apply — duplicate services (QA T, 2026-10-29: nursing 77 rows with most services 2-3 times and ~25 rows whose `code` is binary bytes; labs HIV x3,
 * Testosterone x2, QFT x2; radiology 21 legacy duplicates). One row per service (owner decision #1556, F):
 *   - labs and nursing: rows that are the same service by name or code (catalog-dedupe.ts `duplicateGroups`, labs split by package/single) form a group; the row to keep is
 *     `pickKeeper` (live and approved first, a real code, the most filled, the oldest); the others are hidden (`is_deleted: true`, `merged_into: <kept id>`) and whatever
 *     they had that the kept row lacks is copied onto it. Nothing is deleted from the catalogue: a hidden row stays for the history that names it.
 *   - radiology: the legacy codes and the second inserts are hidden by planRadiologyCatalogue (same step, same approve list); this step only follows them with the references.
 *   - references to a hidden row are re-pointed to the kept one, each as a compare-and-set: provider offers (provider_service_offers: moved, or the loser's row deleted when the
 *     provider already has one for the kept service), the provider profile lists and price/insurance/home maps (test_categories, equipment_list, nursing_services,
 *     test_prices ...), capability rows, bookings (items[].service_id, service_id, service_ids), and notify-me interests (moved, or deleted when the patient already asked for
 *     the kept service). Order history keeps its snapshot names and prices; only the id it points at changes.
 * The report lists counts and ids (never a name) and how many references each rule re-pointed. A second plan after the apply is empty.
 */
import type { Change, DbLike } from './catalogue-apply.core';
import { duplicateGroups, missingFields, pickKeeper, weakRadiologyKey, type CatalogDoc } from './catalog-dedupe';
import { CATALOG_COLLECTIONS } from './catalog-collections';
import { planRadiologyCatalogue } from './catalogue-apply.steps';

type Vertical = 'lab' | 'radiology' | 'nursing';
const STEP = 'catalogue_duplicates';

export interface VerticalReport { rows: number; groups: number; hidden_rows: number; fields_filled: number; skipped_group_without_id: number; sample: Array<{ keep: string; hidden: string[] }>; references: Record<string, number> }
export interface DuplicatesReport { lab: VerticalReport; radiology: VerticalReport; nursing: VerticalReport; total_hidden: number; /** radiology rows with the same modality, body part and contrast under different names: reported for the owner, never merged (ids only) */ radiology_same_scan_candidates: string[][] }

/** Radiology rows that share modality, body part and contrast but are not already one strong group: reported for the owner, never merged (a lumbar and a whole-spine MRI can share a body part). */
export function weakRadiologyGroups<T extends CatalogDoc>(rows: T[], strong: T[][]): T[][] {
  const strongOf = new Map<T, number>();
  strong.forEach((g, i) => g.forEach((d) => strongOf.set(d, i)));
  const byKey = new Map<string, T[]>();
  for (const d of rows) { const k = weakRadiologyKey(d); if (k) byKey.set(k, [...(byKey.get(k) ?? []), d]); }
  return [...byKey.values()].filter((g) => g.length > 1 && new Set(g.map((d) => (strongOf.has(d) ? `s${strongOf.get(d)}` : `r${idOf(d) || Math.random()}`))).size > 1);
}

const emptyReport = (rows: number): VerticalReport => ({ rows, groups: 0, hidden_rows: 0, fields_filled: 0, skipped_group_without_id: 0, sample: [], references: {} });
const idOf = (d: CatalogDoc): string => (typeof d.id === 'string' && d.id ? d.id : '');
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const SAMPLE = 12;

/** The profile list fields that hold catalogue ids, and the keyed maps next to them (price / insurance / home by id). */
const PROFILE_REFS: Record<Vertical, { lists: string[]; maps: string[] }> = {
  lab: { lists: ['test_categories'], maps: ['test_prices', 'test_home_map', 'test_insurance_map', 'test_turnaround_map'] },
  radiology: { lists: ['equipment_list'], maps: ['scan_prices', 'scan_insurance_map'] },
  nursing: { lists: [], maps: [] },
};
const BOOKINGS: Record<Vertical, { collection: string; itemsField?: string; scalar?: string; list?: string } | null> = {
  lab: { collection: 'labbookings', itemsField: 'items' },
  radiology: { collection: 'radiologybookings', itemsField: 'items' },
  nursing: { collection: 'homecarebookings', scalar: 'service_id', list: 'service_ids' },
};

async function repoint(db: DbLike, vertical: Vertical, keeperOf: Map<string, string>, changes: Change[], refs: Record<string, number>): Promise<void> {
  const loserIds = [...keeperOf.keys()];
  if (!loserIds.length) return;
  const count = (rule: string) => { refs[rule] = (refs[rule] ?? 0) + 1; };
  const set = (collection: string, id: unknown, path: string, before: unknown, after: unknown, rule: string) => { changes.push({ kind: 'set', step: STEP, collection, key: { _id: id }, path, before: before ?? null, after }); count(rule); };

  // 1. the provider's own per-service choice: moved, or dropped when it already has one for the kept service
  const offers = await db.collection('provider_service_offers').find({ vertical, service_id: { $in: loserIds } }, {}).toArray();
  for (const o of offers) {
    const keeper = keeperOf.get(str(o.service_id))!;
    const has = await db.collection('provider_service_offers').find({ vertical, provider_account_id: o.provider_account_id, service_id: keeper }, { projection: { _id: 1 } }).toArray();
    if (has.length) { changes.push({ kind: 'delete', step: STEP, collection: 'provider_service_offers', key: { _id: o._id }, doc: o }); count('provider_service_offers_dropped'); }
    else set('provider_service_offers', o._id, 'service_id', o.service_id, keeper, 'provider_service_offers_moved');
  }

  // 2. the provider profile lists and keyed maps
  const { lists, maps } = PROFILE_REFS[vertical];
  for (const field of lists) {
    for (const p of await db.collection('provider_profiles').find({ [field]: { $in: loserIds } }, { projection: { _id: 1, [field]: 1 } }).toArray()) {
      const before: unknown[] = Array.isArray(p[field]) ? p[field] : [];
      const after = [...new Set(before.map((x) => (typeof x === 'string' && keeperOf.has(x) ? keeperOf.get(x)! : x)))];
      if (JSON.stringify(after) !== JSON.stringify(before)) set('provider_profiles', p._id, field, before, after, `profile_${field}`);
    }
  }
  for (const field of maps) {
    for (const loser of loserIds) {
      for (const p of await db.collection('provider_profiles').find({ [`${field}.${loser}`]: { $exists: true } }, { projection: { _id: 1, [field]: 1 } }).toArray()) {
        const keeper = keeperOf.get(loser)!;
        if (p[field] && !(keeper in p[field])) set('provider_profiles', p._id, `${field}.${keeper}`, null, p[field][loser], `profile_${field}`);
      }
    }
  }
  if (vertical === 'nursing') {
    for (const p of await db.collection('provider_profiles').find({ 'nursing_services.key': { $in: loserIds } }, { projection: { _id: 1, nursing_services: 1 } }).toArray()) {
      const before: Array<Record<string, unknown>> = Array.isArray(p.nursing_services) ? p.nursing_services : [];
      const seen = new Set<string>();
      const after: Array<Record<string, unknown>> = [];
      // an entry for the kept service that exists already wins; a loser's entry is moved only when there is none
      const keptKeys = new Set(before.map((e) => str(e?.key)));
      for (const e of before) {
        const key = str(e?.key);
        const next = keeperOf.get(key);
        if (next && keptKeys.has(next)) continue;
        const entry = next ? { ...e, key: next } : e;
        const k = str(entry.key);
        if (k && seen.has(k)) continue;
        if (k) seen.add(k);
        after.push(entry);
      }
      if (JSON.stringify(after) !== JSON.stringify(before)) set('provider_profiles', p._id, 'nursing_services', before, after, 'profile_nursing_services');
    }
  }

  // 3. capability rows (the old per-provider price list): the row that names the hidden service by its id
  const caps: Array<{ collection: string; field: string }> = vertical === 'lab' ? [{ collection: 'provider_capabilities_lab', field: 'code' }] : vertical === 'radiology' ? [{ collection: 'provider_capabilities_radiology', field: 'service_id' }] : [];
  for (const c of caps) {
    for (const row of await db.collection(c.collection).find({ [c.field]: { $in: loserIds } }, {}).toArray()) {
      const keeper = keeperOf.get(str(row[c.field]))!;
      const has = await db.collection(c.collection).find({ provider_account_id: row.provider_account_id, [c.field]: keeper }, { projection: { _id: 1 } }).toArray();
      if (has.length) { changes.push({ kind: 'delete', step: STEP, collection: c.collection, key: { _id: row._id }, doc: row }); count(`${c.collection}_dropped`); }
      else set(c.collection, row._id, c.field, row[c.field], keeper, `${c.collection}_moved`);
    }
  }

  // 4. bookings: only the id the line points at (the line keeps its name and price)
  const b = BOOKINGS[vertical];
  if (b?.itemsField) {
    for (const doc of await db.collection(b.collection).find({ [`${b.itemsField}.service_id`]: { $in: loserIds } }, { projection: { _id: 1, [b.itemsField]: 1 } }).toArray()) {
      (doc[b.itemsField] as Array<{ service_id?: unknown }>).forEach((it, i) => { const k = keeperOf.get(str(it?.service_id)); if (k) set(b.collection, doc._id, `${b.itemsField}.${i}.service_id`, it.service_id, k, `${b.collection}_items`); });
    }
  }
  if (b?.scalar) {
    for (const doc of await db.collection(b.collection).find({ [b.scalar]: { $in: loserIds } }, { projection: { _id: 1, [b.scalar]: 1 } }).toArray()) set(b.collection, doc._id, b.scalar, doc[b.scalar], keeperOf.get(str(doc[b.scalar]))!, `${b.collection}_${b.scalar}`);
  }
  if (b?.list) {
    for (const doc of await db.collection(b.collection).find({ [b.list]: { $in: loserIds } }, { projection: { _id: 1, [b.list]: 1 } }).toArray()) {
      const before: unknown[] = doc[b.list];
      const after = [...new Set(before.map((x) => (typeof x === 'string' && keeperOf.has(x) ? keeperOf.get(x)! : x)))];
      set(b.collection, doc._id, b.list, before, after, `${b.collection}_${b.list}`);
    }
  }

  // 5. "notify me" interests
  for (const row of await db.collection('service_interests').find({ service_type: vertical, service_id: { $in: loserIds } }, {}).toArray()) {
    const keeper = keeperOf.get(str(row.service_id))!;
    const has = await db.collection('service_interests').find({ service_type: vertical, service_id: keeper, user_id: row.user_id }, { projection: { _id: 1 } }).toArray();
    if (has.length) { changes.push({ kind: 'delete', step: STEP, collection: 'service_interests', key: { _id: row._id }, doc: row }); count('service_interests_dropped'); }
    else set('service_interests', row._id, 'service_id', row.service_id, keeper, 'service_interests_moved');
  }
}

/** Merge one group of the same service into its keeper: hide the others (merged_into), copy what the keeper lacks, remember which id points at which. */
function mergeGroup(group: CatalogDoc[], collection: string, v: VerticalReport, changes: Change[], keeperOf: Map<string, string>): void {
  const keeper = pickKeeper(group);
  const losers = group.filter((g) => g !== keeper);
  if (!idOf(keeper) || losers.some((l) => !idOf(l))) { v.skipped_group_without_id += 1; return; }
  v.groups += 1; v.hidden_rows += losers.length;
  if (v.sample.length < SAMPLE) v.sample.push({ keep: idOf(keeper), hidden: losers.map(idOf) });
  for (const [field, value] of Object.entries(missingFields(keeper, losers))) {
    changes.push({ kind: 'set', step: STEP, collection, key: { _id: keeper._id }, path: field, before: null, after: value }); v.fields_filled += 1;
  }
  for (const l of losers) {
    changes.push({ kind: 'set', step: STEP, collection, key: { _id: l._id }, path: 'is_deleted', before: l.is_deleted === undefined ? null : l.is_deleted, after: true });
    changes.push({ kind: 'set', step: STEP, collection, key: { _id: l._id }, path: 'merged_into', before: null, after: idOf(keeper) });
    keeperOf.set(idOf(l), idOf(keeper));
  }
}

export async function planCatalogueDuplicates(db: DbLike, opts: { radiologyApprove?: string[] } = {}): Promise<{ changes: Change[]; report: DuplicatesReport }> {
  const changes: Change[] = [];
  const report: DuplicatesReport = { lab: emptyReport(0), radiology: emptyReport(0), nursing: emptyReport(0), total_hidden: 0, radiology_same_scan_candidates: [] };

  // labs and nursing: the groups of rows that are the same service
  for (const [vertical, collection] of [['lab', CATALOG_COLLECTIONS.lab_services], ['nursing', CATALOG_COLLECTIONS.nursing_services]] as const) {
    const rows = ((await db.collection(collection).find({}, {}).toArray()) as CatalogDoc[]).filter((r) => !(r.is_deleted === true && str(r.merged_into)));
    const live = rows.filter((r) => r.is_deleted !== true);
    const v = report[vertical]; v.rows = rows.length;
    const keeperOf = new Map<string, string>();
    for (const group of duplicateGroups(live, { byPackage: vertical === 'lab' })) mergeGroup(group, collection, v, changes, keeperOf);
    await repoint(db, vertical, keeperOf, changes, v.references);
  }

  // radiology: the legacy codes and the second inserts are hidden by the radiology step; follow them with the references
  {
    const coll = CATALOG_COLLECTIONS.radiology_services;
    const rows = (await db.collection(coll).find({}, {}).toArray()) as CatalogDoc[];
    const v = report.radiology; v.rows = rows.length;
    const hidden = (await planRadiologyCatalogue(db, opts.radiologyApprove ?? [])).changes.filter((c) => c.kind === 'set' && c.path === 'merged_into');
    const byId = new Map(rows.map((r) => [String(r._id), r]));
    const keeperOf = new Map<string, string>();
    for (const c of hidden) {
      if (c.kind !== 'set') continue;
      const loser = byId.get(String(c.key._id));
      const into = String(c.after);
      const code = (r: CatalogDoc) => str(r.short_code) || str(r.code) || idOf(r);
      const candidates = rows.filter((r) => r !== loser && code(r) === into && r.is_deleted !== true && idOf(r));
      const keeper = candidates.length ? pickKeeper(candidates) : undefined;
      if (!loser || !idOf(loser) || !keeper) continue;
      keeperOf.set(idOf(loser), idOf(keeper));
      v.hidden_rows += 1;
      if (v.sample.length < SAMPLE) v.sample.push({ keep: idOf(keeper), hidden: [idOf(loser)] });
    }
    v.groups = new Set(keeperOf.values()).size;
    // the same scan under two names / an abbreviation (strong keys, as for labs and nursing), among the rows the legacy step does not already hide
    const hiddenIds = new Set(keeperOf.keys());
    const live = rows.filter((r) => r.is_deleted !== true && idOf(r) && !hiddenIds.has(idOf(r)));
    const strong = duplicateGroups(live);
    for (const group of strong) mergeGroup(group, coll, v, changes, keeperOf);
    report.radiology_same_scan_candidates = weakRadiologyGroups(live, strong).map((g) => g.map(idOf));
    await repoint(db, 'radiology', keeperOf, changes, v.references);
  }

  report.total_hidden = report.lab.hidden_rows + report.nursing.hidden_rows + report.radiology.hidden_rows;
  return { changes, report };
}
