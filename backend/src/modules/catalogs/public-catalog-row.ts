/**
 * What the public catalogue endpoints (`GET /catalogs/:type`) return for a row: the fields a patient or a provider app shows, never the record's audit or
 * soft-delete fields (QA 2026-10-29: nursing rows carried `created_by`, `updated_by`, `deleted_at`, `is_deleted`, `__v`, and the machine-edit markers).
 * A denylist by shape rather than a list of today's fields, so a field added to a catalogue schema later is public only if it is not an audit field.
 */
const INTERNAL_KEY = /^(_id|__v|is_deleted|deleted_at|deleted_by|created_by|updated_by|[a-z_]+_by|machine_[a-z_]+|audit_[a-z_]+)$/;

export const isInternalCatalogField = (key: string): boolean => INTERNAL_KEY.test(key);

export function toPublicCatalogRow<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) if (!isInternalCatalogField(key)) out[key] = value;
  return out as Partial<T>;
}
