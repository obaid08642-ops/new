/**
 * Step 13 of the catalogue apply — completing the radiology, lab and nursing catalogues (owner approved, 2026-10-29). The lead's market review against Saudi lab, radiology and
 * home-care menus stands in for the medical review until the clinical review before the store launch, so every row this step approves or adds carries
 * `reviewed_by: "lead-market-review-2026-10-29"` and `needs_clinical_review: true` (list them later with that flag).
 *   - APPROVE: radiology — the 7 hidden real scans (the list in the seed file is merged into the radiology step's approve list, which writes the approval; this step only adds the review
 *     marks); labs and nursing — every real row still pending (`medical_review_status` pending or missing, not hidden, not a duplicate loser of step 12). A row an admin rejected or
 *     suspended is never touched.
 *   - ADD: the new rows of the seed file (shipped in the image), catalogue rows only (no prices: a provider sets its own). A row is skipped when a live row already has its code or its name.
 *     Ids are derived from the vertical and the code, so the plan hash is the same on the dry run and the apply. `code` is always set (the apply's insert guard looks a document up by `code`).
 *   - NURSING booking mode: every live nursing row gets `booking_mode` (visit | continuous | programme) and its `booking_options`, written only where the row has none.
 * The report lists counts and codes only, and compares the pending counts with the ones the lead expected (it does not stop on a difference: the lead reads it).
 */
import { v5 as uuidv5 } from 'uuid';
import type { Change, DbLike, SetChange } from './catalogue-apply.core';
import { CATALOG_COLLECTIONS } from './catalog-collections';

const STEP = 'catalogue_completion';
const NAMESPACE = 'b3e1c0a8-6f0d-4c1e-9a57-2f3a8d9c5e11';

export type BookingMode = 'visit' | 'continuous' | 'programme';

interface RadiologySeed { code: string; name_ar: string; name_en: string; modality: string; body_part: string; fasting_hours: number; contrast_required: boolean; estimated_duration_minutes: number; turnaround_hours: number; preparation_ar: string[]; preparation_en: string[]; description_ar: string; description_en: string; requires_pregnancy_check: boolean; requires_metal_implant_check: boolean; requires_contrast_allergy_check: boolean }
interface LabSeed { code: string; name_ar: string; name_en: string; category: string; sample_type: string; fasting_hours: number; turnaround_hours: number; home_collection: boolean; description_ar: string; description_en: string; preparation_ar: string[]; preparation_en: string[] }
interface NursingSeed { code: string; name_ar: string; name_en: string; category: string; duration: string; duration_value: number; booking_mode: BookingMode; description_ar: string; description_en: string; preparation_ar: string[]; preparation_en: string[]; requires_patient_medication: boolean; requires_companion: boolean; icon: string }
export interface CompletionSeed {
  reviewed_by: string; needs_clinical_review: boolean;
  radiology_approve: string[]; expected_pending: { radiology: number; labs: number; nursing: number };
  radiology: RadiologySeed[]; labs: LabSeed[]; nursing: NursingSeed[];
  nursing_booking_overrides: Partial<Record<BookingMode, string[]>>;
  booking_options: Record<BookingMode, Record<string, unknown>>;
}

interface VerticalReport { rows: number; pending_real: number; expected_pending: number; approved: number; added: number; skipped_existing: string[]; added_codes: string[] }
export interface CompletionReport {
  reviewed_by: string; radiology: VerticalReport; labs: VerticalReport; nursing: VerticalReport;
  nursing_booking_modes: Record<BookingMode, number>; pending_counts_match_expected: boolean;
}

const norm = (s: unknown): string => String(s ?? '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '');
const idStr = (v: unknown): string => String((v as { toString?: () => string })?.toString?.() ?? v);
const codeOf = (r: any): string => String(r.short_code || r.code || '');

/** Mode of an EXISTING nursing row: the seed's name lists first, else long durations (a shift, or 4+ hours) are continuous care, the rest one-off visits. */
export function modeOfExisting(row: { name_en?: string; duration?: string; duration_value?: number }, seed: CompletionSeed): BookingMode {
  for (const mode of ['programme', 'continuous'] as const) if ((seed.nursing_booking_overrides[mode] ?? []).includes(String(row.name_en))) return mode;
  if (row.duration === 'shift' || Number(row.duration_value) >= 4) return 'continuous';
  return 'visit';
}

export interface CompletionOptions {
  seed: CompletionSeed;
  /** step 12's changes: the rows it hides are duplicates, never approved here */
  duplicateChanges: Change[];
  /** the `_id`s the radiology step approves (from its changes), which only get the review marks here */
  radiologyApprovedIds: unknown[];
}

export async function planCatalogueCompletion(db: DbLike, opts: CompletionOptions): Promise<{ changes: Change[]; report: CompletionReport }> {
  const { seed } = opts;
  const changes: Change[] = [];
  const losers = new Set<string>(opts.duplicateChanges.filter((c) => c.kind === 'set' && c.path === 'is_deleted' && c.after === true).map((c) => idStr((c as SetChange).key._id)));
  const projection = { _id: 1, id: 1, code: 1, short_code: 1, name_en: 1, name_ar: 1, active: 1, is_deleted: 1, public_eligibility: 1, medical_review_status: 1, reviewed_by: 1, needs_clinical_review: 1, booking_mode: 1, booking_options: 1, duration: 1, duration_value: 1 };
  const marks = (coll: string, row: any) => {
    const set = (path: string, before: unknown, after: unknown) => changes.push({ kind: 'set', step: STEP, collection: coll, key: { _id: row._id }, path, before: before === undefined ? null : before, after });
    if (row.reviewed_by !== seed.reviewed_by) set('reviewed_by', row.reviewed_by, seed.reviewed_by);
    if (row.needs_clinical_review !== true) set('needs_clinical_review', row.needs_clinical_review, true);
  };
  const approve = (coll: string, row: any) => {
    const set = (path: string, before: unknown, after: unknown) => changes.push({ kind: 'set', step: STEP, collection: coll, key: { _id: row._id }, path, before: before === undefined ? null : before, after });
    set('public_eligibility', row.public_eligibility, true);
    set('medical_review_status', row.medical_review_status, 'approved');
    if (row.active === false) set('active', false, true);
    if (row.is_deleted === undefined) set('is_deleted', undefined, false);
    marks(coll, row);
  };
  const pendingReal = (row: any): boolean => row.is_deleted !== true && !losers.has(idStr(row._id))
    && (row.medical_review_status === undefined || row.medical_review_status === null || row.medical_review_status === 'pending')
    && !(row.public_eligibility === true && row.medical_review_status === 'approved');
  const vr = (rows: number, expected: number): VerticalReport => ({ rows, pending_real: 0, expected_pending: expected, approved: 0, added: 0, skipped_existing: [], added_codes: [] });

  // ---- radiology: marks on the scans the radiology step approves; new scans
  const radColl = CATALOG_COLLECTIONS.radiology_services;
  const radRows: any[] = await db.collection(radColl).find({}, { projection }).toArray();
  const radReport = vr(radRows.length, seed.expected_pending.radiology);
  const approvedIds = new Set(opts.radiologyApprovedIds.map(idStr));
  for (const row of radRows) if (approvedIds.has(idStr(row._id))) { marks(radColl, row); radReport.approved += 1; if (row.is_deleted === undefined) changes.push({ kind: 'set', step: STEP, collection: radColl, key: { _id: row._id }, path: 'is_deleted', before: null, after: false }); }
  radReport.pending_real = approvedIds.size;

  const present = (rows: any[]) => {
    const live = rows.filter((r) => r.is_deleted !== true && !losers.has(idStr(r._id)));
    return { codes: new Set(live.map((r) => norm(codeOf(r))).filter(Boolean)), names: new Set(live.flatMap((r) => [norm(r.name_en), norm(r.name_ar)]).filter(Boolean)) };
  };
  const addRows = (coll: string, vertical: string, rows: any[], items: Array<{ code: string; name_ar: string; name_en: string }>, build: (s: any) => Record<string, unknown>, report: VerticalReport) => {
    const p = present(rows);
    for (const s of items) {
      if (p.codes.has(norm(s.code)) || p.names.has(norm(s.name_en)) || p.names.has(norm(s.name_ar))) { report.skipped_existing.push(s.code); continue; }
      changes.push({ kind: 'insert', step: STEP, collection: coll, doc: { ...build(s), id: uuidv5(`${vertical}:${s.code}`, NAMESPACE) } });
      report.added += 1; report.added_codes.push(s.code);
    }
  };
  const common = { active: true, is_active: true, is_deleted: false, cash_availability: true, insurance_availability: false, popularity: 50, version: 1,
    medical_review_status: 'approved', public_eligibility: true, reviewed_by: seed.reviewed_by, needs_clinical_review: true, price: null };
  addRows(radColl, 'radiology', radRows, seed.radiology, (s: RadiologySeed) => ({
    ...common, code: s.code, short_code: s.code, name_ar: s.name_ar, name_en: s.name_en, modality: s.modality, body_part: s.body_part,
    contrast_required: s.contrast_required, fasting_required: s.fasting_hours > 0, fasting_hours: s.fasting_hours,
    description_ar: s.description_ar, description_en: s.description_en, preparation_ar: s.preparation_ar, preparation_en: s.preparation_en,
    estimated_duration_minutes: s.estimated_duration_minutes, turnaround_hours: s.turnaround_hours, home_visit_supported: false, facility_visit_supported: true,
    requires_pregnancy_check: s.requires_pregnancy_check, requires_metal_implant_check: s.requires_metal_implant_check, requires_contrast_allergy_check: s.requires_contrast_allergy_check,
  }), radReport);

  // ---- labs
  const labColl = CATALOG_COLLECTIONS.lab_services;
  const labRows: any[] = await db.collection(labColl).find({}, { projection }).toArray();
  const labReport = vr(labRows.length, seed.expected_pending.labs);
  for (const row of labRows) if (pendingReal(row)) { approve(labColl, row); labReport.pending_real += 1; labReport.approved += 1; }
  addRows(labColl, 'lab', labRows, seed.labs, (s: LabSeed) => ({
    ...common, code: s.code, short_code: s.code, name_ar: s.name_ar, name_en: s.name_en, category: s.category, sample_type: s.sample_type,
    fasting_required: s.fasting_hours > 0, fasting_hours: s.fasting_hours, turnaround_hours: s.turnaround_hours,
    home_visit_supported: s.home_collection, facility_visit_supported: true, home_collection_availability: s.home_collection, in_lab_availability: true,
    description_ar: s.description_ar, description_en: s.description_en, preparation_ar: s.preparation_ar, preparation_en: s.preparation_en,
    is_package: false, included_services: [], medical_referral_required: false, old_price: null,
  }), labReport);

  // ---- nursing: approvals, new rows, booking modes
  const nurColl = CATALOG_COLLECTIONS.nursing_services;
  const nurRows: any[] = await db.collection(nurColl).find({}, { projection }).toArray();
  const nurReport = vr(nurRows.length, seed.expected_pending.nursing);
  for (const row of nurRows) if (pendingReal(row)) { approve(nurColl, row); nurReport.pending_real += 1; nurReport.approved += 1; }
  addRows(nurColl, 'nursing', nurRows, seed.nursing, (s: NursingSeed) => ({
    ...common, code: s.code, name_ar: s.name_ar, name_en: s.name_en, category: s.category, duration: s.duration, duration_value: s.duration_value,
    description_ar: s.description_ar, description_en: s.description_en, preparation_ar: s.preparation_ar, preparation_en: s.preparation_en,
    requires_patient_medication: s.requires_patient_medication, requires_companion: s.requires_companion, icon: s.icon,
    booking_mode: s.booking_mode, booking_options: seed.booking_options[s.booking_mode],
  }), nurReport);
  const modes: Record<BookingMode, number> = { visit: 0, continuous: 0, programme: 0 };
  for (const row of nurRows) {
    if (row.is_deleted === true || losers.has(idStr(row._id)) || (row.booking_mode !== undefined && row.booking_mode !== null)) continue;
    const mode = modeOfExisting(row, seed);
    modes[mode] += 1;
    changes.push({ kind: 'set', step: STEP, collection: nurColl, key: { _id: row._id }, path: 'booking_mode', before: null, after: mode });
    changes.push({ kind: 'set', step: STEP, collection: nurColl, key: { _id: row._id }, path: 'booking_options', before: null, after: seed.booking_options[mode] });
  }
  for (const s of seed.nursing) if (nurReport.added_codes.includes(s.code)) modes[s.booking_mode] += 1;

  const report: CompletionReport = {
    reviewed_by: seed.reviewed_by, radiology: radReport, labs: labReport, nursing: nurReport, nursing_booking_modes: modes,
    pending_counts_match_expected: radReport.pending_real === radReport.expected_pending && labReport.pending_real === labReport.expected_pending && nurReport.pending_real === nurReport.expected_pending,
  };
  return { changes, report };
}
