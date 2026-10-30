/**
 * Owner rule (2026-10-30): a wrong or duplicate catalogue row is DELETED (the whole before-image is in the backup), never hidden. The duplicates step and the radiology step mark the rows
 * they merge away (`merged_into`, `is_deleted: true`) so that the references can be re-pointed to the kept row; left like that, the rows stay in the database as hidden rows.
 *
 * This pass runs over the finished plan. For every row the plan marks that way it asks: after the plan's own re-pointing, does anything still name this row (provider offers, provider
 * profile lists, capability rows, bookings, orders, carts, notify-me interests: the references `catalogue_prune` knows)? If not, the two marker writes are replaced by ONE delete
 * (before-image included). If something still names it (a place the plan does not re-point), the row stays marked and is counted per place, so nothing is orphaned; `catalogue_prune`
 * deletes it later once the reference is gone.
 */
import type { Change, DbLike } from './catalogue-apply.core';
import { CATALOG_COLLECTIONS } from './catalog-collections';
import { VERTICALS, COMMON_REFS, collect } from './catalogue-prune';

const CHUNK = 500;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const keyOf = (collection: string, id: unknown) => `${collection}|${String(id)}`;
/** The _id a change is about (an insert names its own document). */
const changeId = (c: Change): unknown => (c.kind === 'insert' ? (c.doc as Record<string, unknown>)._id : c.key._id);

export interface HiddenDeleteReport { by_collection: Record<string, { marked: number; deleted: number; kept_referenced: number; referenced_by: Record<string, number> }>; deleted: number; kept_referenced: number }

/** Assign `value` at a dot path of a document (numeric segments index arrays); false when the path does not exist. */
function setPath(doc: Record<string, any>, path: string, value: unknown): boolean {
  const parts = path.split('.');
  let node: any = doc;
  for (let i = 0; i < parts.length - 1; i++) { node = node?.[parts[i]]; if (node === null || node === undefined || typeof node !== 'object') return false; }
  node[parts[parts.length - 1]] = value;
  return true;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export async function deleteUnreferencedHidden(db: DbLike, changes: Change[]): Promise<{ changes: Change[]; report: HiddenDeleteReport }> {
  const report: HiddenDeleteReport = { by_collection: {}, deleted: 0, kept_referenced: 0 };
  const known = VERTICALS.map((v) => ({ ...v }));
  // rows the plan marks as merged away or deleted, per catalogue collection
  const marked = new Map<string, { collection: string; vertical: (typeof known)[number]; _id: unknown }>();
  for (const c of changes) {
    if (c.kind !== 'set') continue;
    const v = known.find((x) => x.collection === c.collection);
    if (!v) continue;
    const isMarker = (c.path === 'merged_into' && str(c.after)) || (c.path === 'is_deleted' && c.after === true);
    if (isMarker) marked.set(keyOf(c.collection, c.key._id), { collection: c.collection, vertical: v, _id: c.key._id });
  }
  if (!marked.size) return { changes, report };

  for (const v of known) {
    const mine = [...marked.values()].filter((m) => m.vertical === v);
    if (!mine.length) continue;
    const rep = (report.by_collection[v.collection] = { marked: mine.length, deleted: 0, kept_referenced: 0, referenced_by: {} });
    const docs: Array<Record<string, any>> = [];
    for (let i = 0; i < mine.length; i += CHUNK) docs.push(...(await db.collection(v.collection).find({ _id: { $in: mine.slice(i, i + CHUNK).map((m) => m._id) } }, {}).toArray()) as Array<Record<string, any>>);
    const byId = new Map(docs.map((d) => [keyOf(v.collection, d._id), d]));
    const ids = docs.map((d) => str(d.id)).filter(Boolean);

    // every document that names one of these rows, as the plan will leave it
    const refs = [...v.refs, ...COMMON_REFS];
    const overlay = new Map<string, { doc: Record<string, any>; removed: boolean; collection: string }>();
    for (const ref of refs) {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        for (const d of (await db.collection(ref.collection).find({ [ref.path]: { $in: slice } }, {}).toArray()) as Array<Record<string, any>>) {
          const k = keyOf(ref.collection, d._id);
          if (!overlay.has(k)) overlay.set(k, { doc: clone(d), removed: false, collection: ref.collection });
        }
      }
    }
    for (const c of changes) {
      const o = overlay.get(keyOf(c.collection, changeId(c)));
      if (!o) continue;
      if (c.kind === 'delete') o.removed = true;
      else if (c.kind === 'set') setPath(o.doc, c.path, c.after);
    }
    const stillNames = (id: string): Set<string> => {
      const places = new Set<string>();
      for (const ref of refs) {
        for (const o of overlay.values()) {
          if (o.removed || o.collection !== ref.collection) continue;
          if (collect(o.doc, ref.path.split('.')).includes(id)) places.add(`${ref.collection}.${ref.path}`);
        }
      }
      return places;
    };
    // a row another (surviving) row was merged into stays while that row stays
    const lostIds = new Set(docs.map((d) => str(d.id)));
    const others: Array<Record<string, any>> = ids.length ? await db.collection(v.collection).find({ merged_into: { $in: ids } }, {}).toArray() as Array<Record<string, any>> : [];

    const deleteKeys = new Set<string>();
    const deletes: Change[] = [];
    for (const m of mine) {
      const d = byId.get(keyOf(v.collection, m._id));
      if (!d) continue;   // the row is not in the database (an insert of this plan, or already gone)
      const id = str(d.id);
      const places = id ? stillNames(id) : new Set(['(no id)']);
      const mergedFromSurvivor = others.some((o) => str(o.merged_into) === id && !lostIds.has(str(o.id)));
      if (mergedFromSurvivor) places.add(`${v.collection}.merged_into`);
      if (places.size === 0) {
        deleteKeys.add(keyOf(v.collection, d._id));
        deletes.push({ kind: 'delete', step: 'catalogue_hidden_delete', collection: v.collection, key: { _id: d._id }, doc: d });
        rep.deleted += 1;
      } else {
        rep.kept_referenced += 1;
        for (const p of places) rep.referenced_by[p] = (rep.referenced_by[p] ?? 0) + 1;
      }
    }
    if (deleteKeys.size) {
      changes = changes.filter((c) => !(c.collection === v.collection && deleteKeys.has(keyOf(c.collection, changeId(c)))));
      changes = [...changes, ...deletes];
    }
  }
  for (const r of Object.values(report.by_collection)) { report.deleted += r.deleted; report.kept_referenced += r.kept_referenced; }
  return { changes, report };
}

export const HIDDEN_DELETE_COLLECTIONS = [CATALOG_COLLECTIONS.lab_services, CATALOG_COLLECTIONS.radiology_services, CATALOG_COLLECTIONS.nursing_services];
