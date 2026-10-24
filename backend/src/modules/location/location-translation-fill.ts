import { createHash } from 'crypto';
import type { LocationTranslation } from './seeds/location-translations.data';

/**
 * The rules of the production migration that fills the Urdu, Hindi, Bengali and Filipino names of the locations (issue 1831;
 * scripts/migrations/2026-10-location-translations-fill.ts). Pure: it plans, it does not touch a database.
 *   - only a field that is absent or empty is filled; a value already there (an admin's edit, a reviewed translation) is kept;
 *   - the production apply needs the SHA-256 of the translation table the dry run printed;
 *   - the backup records what was written, and a rollback restores a field only while it still holds the value written.
 */
export const LOCATION_FIELDS = ['name_ur', 'name_hi', 'name_bn', 'name_tl'] as const;
export type LocationField = (typeof LOCATION_FIELDS)[number];

export type LocationRow = { code: string } & Partial<Record<LocationField, string | null>>;
export type LocationChange = { code: string; field: LocationField; before: null; after: string };
export type LocationPlan = {
  changes: LocationChange[];
  /** fields that already hold a value, left as they are */
  kept: Array<{ code: string; field: LocationField }>;
  /** codes of the table that the export does not hold */
  missing: string[];
};

const blank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

export function planLocationFill(rows: LocationRow[], table: Record<string, LocationTranslation>): LocationPlan {
  const byCode = new Map(rows.map((row) => [row.code, row]));
  const plan: LocationPlan = { changes: [], kept: [], missing: [] };
  for (const [code, names] of Object.entries(table)) {
    const row = byCode.get(code);
    if (!row) {
      plan.missing.push(code);
      continue;
    }
    for (const field of LOCATION_FIELDS) {
      if (blank(row[field])) plan.changes.push({ code, field, before: null, after: names[field] });
      else plan.kept.push({ code, field });
    }
  }
  return plan;
}

/** A stable SHA-256 of the table (keys sorted), the confirmation the production apply asks for. */
export function tableSha256(table: Record<string, LocationTranslation>): string {
  const sorted = Object.keys(table).sort().map((code) => [code, ...LOCATION_FIELDS.map((field) => table[code][field])]);
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

export function checkConfirmation(given: string | undefined, expected: string): boolean {
  return typeof given === 'string' && given.length > 0 && given === expected;
}

export type LocationBackup = { table_sha256: string; created_at: string; changes: LocationChange[] };

export function buildBackup(plan: LocationPlan, sha: string, createdAt: string): LocationBackup {
  return { table_sha256: sha, created_at: createdAt, changes: plan.changes };
}

/** Undoing one change: unset the field, but only while it still holds the value this migration wrote. */
export function rollbackUpdate(change: LocationChange): { filter: Record<string, unknown>; update: Record<string, unknown> } {
  return { filter: { code: change.code, [change.field]: change.after }, update: { $unset: { [change.field]: '' } } };
}
