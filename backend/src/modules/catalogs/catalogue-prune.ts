/**
 * Step `catalogue_prune` (owner 2026-10-30): the owner does not want hidden, wrong or duplicate catalogue rows kept. A lab, radiology or nursing row that is
 *   - a duplicate (`merged_into` set by catalogue_duplicates), or deleted (`is_deleted`), or inactive (`active`/`is_active` false), or rejected
 *     (`medical_review_status: rejected`), or approved but hidden (`public_eligibility: false`)
 * AND is referenced by nothing is DELETED (the whole before-image is in the plan, so the backup can put it back, like test_data). DELETE ONLY: a row that something
 * still points at is left exactly as it is (its old booking / offer / cart line / interest keeps working) and is counted per place it is referenced from.
 * A draft an admin is still working on (pending review, not published, not hidden for another reason) is never deleted here; it is only counted.
 * References checked: provider service offers, provider profile lists (test_categories, equipment_list, nursing_services[].key), capability rows, lab / radiology /
 * home-care bookings, medical orders, unified carts, notify-me interests, and another row's `merged_into`.
 * Run it AFTER the duplicates step has been applied: the duplicates step re-points the references of the rows it hides, a plan made before that still sees them referenced.
 */
import type { Change, DbLike } from './catalogue-apply.core';
import { CATALOG_COLLECTIONS } from './catalog-collections';

export const STEP = 'catalogue_prune';
type Vertical = 'lab' | 'radiology' | 'nursing';
const SAMPLE = 12;
const CHUNK = 500;

const VERTICALS: Array<{ vertical: Vertical; collection: string; refs: Array<{ collection: string; path: string }> }> = [
  { vertical: 'lab', collection: CATALOG_COLLECTIONS.lab_services, refs: [
    { collection: 'labbookings', path: 'items.service_id' }, { collection: 'provider_capabilities_lab', path: 'code' }, { collection: 'provider_profiles', path: 'test_categories' } ] },
  { vertical: 'radiology', collection: CATALOG_COLLECTIONS.radiology_services, refs: [
    { collection: 'radiologybookings', path: 'items.service_id' }, { collection: 'provider_capabilities_radiology', path: 'service_id' }, { collection: 'provider_profiles', path: 'equipment_list' } ] },
  { vertical: 'nursing', collection: CATALOG_COLLECTIONS.nursing_services, refs: [
    { collection: 'homecarebookings', path: 'service_id' }, { collection: 'homecarebookings', path: 'service_ids' }, { collection: 'provider_profiles', path: 'nursing_services.key' } ] },
];
/** Referenced from every vertical's rows by id. */
const COMMON_REFS = [
  { collection: 'provider_service_offers', path: 'service_id' }, { collection: 'service_interests', path: 'service_id' },
  { collection: 'unified_carts', path: 'lines.service_id' }, { collection: 'medical_orders', path: 'items.catalog_id' },
];

export type PruneReason = 'duplicate' | 'deleted' | 'inactive' | 'rejected' | 'hidden';
export interface PruneVerticalReport {
  rows: number;
  candidates: Record<PruneReason, number>;
  deleted_rows: number;
  kept_referenced: number;
  referenced_by: Record<string, number>;
  kept_unpublished_pending: number;
  sample_deleted: string[];
  sample_kept_referenced: string[];
}
export interface PruneReport { lab: PruneVerticalReport; radiology: PruneVerticalReport; nursing: PruneVerticalReport; total_deleted: number; total_kept_referenced: number }

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const emptyVertical = (rows: number): PruneVerticalReport => ({ rows, candidates: { duplicate: 0, deleted: 0, inactive: 0, rejected: 0, hidden: 0 }, deleted_rows: 0, kept_referenced: 0, referenced_by: {}, kept_unpublished_pending: 0, sample_deleted: [], sample_kept_referenced: [] });

/** Why a row would be pruned (the first reason that applies), or null for a live row or a draft. */
export function pruneReason(r: Record<string, unknown>): PruneReason | null {
  if (str(r.merged_into)) return 'duplicate';
  if (r.is_deleted === true) return 'deleted';
  if (r.active === false || r.is_active === false) return 'inactive';
  if (r.medical_review_status === 'rejected') return 'rejected';
  if (r.public_eligibility === false && r.medical_review_status === 'approved') return 'hidden';
  return null;
}

/** An unpublished draft: not published, not hidden for any pruneable reason, still waiting for review. */
export const isUnpublishedDraft = (r: Record<string, unknown>): boolean => pruneReason(r) === null && r.public_eligibility !== true && r.medical_review_status !== 'approved';

async function referencedIds(db: DbLike, ids: string[], refs: Array<{ collection: string; path: string }>, into: Map<string, Set<string>>): Promise<void> {
  for (const ref of refs) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const rows = await db.collection(ref.collection).find({ [ref.path]: { $in: slice } }, { projection: { _id: 0, [ref.path]: 1 } }).toArray();
      for (const row of rows) for (const id of collect(row, ref.path.split('.'))) if (slice.includes(id)) { if (!into.has(id)) into.set(id, new Set()); into.get(id)!.add(`${ref.collection}.${ref.path}`); }
    }
  }
}

/** Every string at a dot path of a document (arrays are walked). */
function collect(node: unknown, path: string[]): string[] {
  if (node === null || node === undefined) return [];
  if (Array.isArray(node)) return node.flatMap((n) => collect(n, path));
  if (!path.length) return typeof node === 'string' ? [node] : [];
  if (typeof node !== 'object') return [];
  return collect((node as Record<string, unknown>)[path[0]], path.slice(1));
}

export async function planCataloguePrune(db: DbLike): Promise<{ changes: Change[]; report: PruneReport }> {
  const changes: Change[] = [];
  const report: PruneReport = { lab: emptyVertical(0), radiology: emptyVertical(0), nursing: emptyVertical(0), total_deleted: 0, total_kept_referenced: 0 };
  for (const { vertical, collection, refs } of VERTICALS) {
    const rows: Array<Record<string, any>> = await db.collection(collection).find({}, {}).toArray();
    const v = report[vertical]; v.rows = rows.length;
    const candidates = rows.filter((r) => pruneReason(r) !== null);
    v.kept_unpublished_pending = rows.filter(isUnpublishedDraft).length;
    for (const r of candidates) v.candidates[pruneReason(r)!] += 1;
    const ids = candidates.map((r) => str(r.id)).filter(Boolean);
    const referenced = new Map<string, Set<string>>();
    await referencedIds(db, ids, [...refs, ...COMMON_REFS], referenced);
    // a row another row was merged into (a keeper) stays while that row stays; when the merged row is itself deleted in this plan the keeper can go too (one pass, so the plan after the apply is empty)
    const mergedFrom = new Map<string, string[]>();
    for (const r of rows) { const into = str(r.merged_into); if (into) mergedFrom.set(into, [...(mergedFrom.get(into) ?? []), str(r.id)]); }
    const deletable = new Set<string>();
    const external = (id: string) => referenced.get(id)?.size ?? 0;
    for (let changed = true; changed;) {
      changed = false;
      for (const r of candidates) {
        const id = str(r.id);
        if (!id || deletable.has(id) || external(id) > 0) continue;
        if ((mergedFrom.get(id) ?? []).some((from) => !deletable.has(from))) continue;
        deletable.add(id); changed = true;
      }
    }
    for (const r of candidates) {
      const id = str(r.id);
      if (!id) { v.kept_referenced += 1; v.referenced_by['(no id)'] = (v.referenced_by['(no id)'] ?? 0) + 1; continue; }   // a row without an id cannot be proven unreferenced
      if (deletable.has(id)) {
        changes.push({ kind: 'delete', step: STEP, collection, key: { _id: r._id }, doc: r });
        v.deleted_rows += 1;
        if (v.sample_deleted.length < SAMPLE) v.sample_deleted.push(id);
        continue;
      }
      v.kept_referenced += 1;
      const by = new Set(referenced.get(id) ?? []);
      if ((mergedFrom.get(id) ?? []).some((from) => !deletable.has(from))) by.add(`${collection}.merged_into`);
      for (const place of by) v.referenced_by[place] = (v.referenced_by[place] ?? 0) + 1;
      if (v.sample_kept_referenced.length < SAMPLE) v.sample_kept_referenced.push(id);
    }
  }
  report.total_deleted = report.lab.deleted_rows + report.radiology.deleted_rows + report.nursing.deleted_rows;
  report.total_kept_referenced = report.lab.kept_referenced + report.radiology.kept_referenced + report.nursing.kept_referenced;
  return { changes, report };
}
