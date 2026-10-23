/**
 * Reviewed duplicate pairs from docs/catalog-audit-gaps.md (3 lab packages, 4 nursing services). Pure helpers shared by
 * scripts/migrations/2026-10-catalogue-merge-pairs.ts and its spec. Unlike catalog-dedupe.ts (a name/code rule over a whole
 * catalogue) a pair names its rows explicitly, and the row kept is the OLDER one.
 */
import { CatalogDoc, nameAr, nameEn, normalizeName } from './catalog-dedupe';

export interface MergePair {
  id: string;
  catalogue: 'lab_services' | 'nursing_services';
  package?: boolean;
  names_en: string[];
  names_ar: string[];
  codes: string[];
}

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/** A row belongs to a pair when its English or Arabic name, or a code, is one the pair lists (packages only match packages). */
export function matchesPair(doc: CatalogDoc, pair: MergePair): boolean {
  if (pair.package !== undefined && (doc.is_package === true) !== pair.package) return false;
  if (doc.is_deleted === true && text(doc.merged_into)) return false; // already merged by an earlier run
  const en = normalizeName(nameEn(doc));
  const ar = normalizeName(nameAr(doc));
  if (en && pair.names_en.some((n) => normalizeName(n) === en)) return true;
  if (ar && pair.names_ar.some((n) => normalizeName(n) === ar)) return true;
  const codes = pair.codes.map((c) => c.toLowerCase());
  return ['short_code', 'test_code', 'code'].some((k) => codes.includes(text(doc[k]).toLowerCase()) && text(doc[k]) !== '');
}

/** Creation time: createdAt, else the ObjectId timestamp, else unknown (sorts last, then by id). */
export function createdTime(doc: CatalogDoc): number {
  const c = doc.createdAt;
  const t = c instanceof Date ? c.getTime() : Date.parse(text(c));
  if (Number.isFinite(t)) return t;
  const oid = doc._id as { getTimestamp?: () => Date } | undefined;
  if (oid && typeof oid.getTimestamp === 'function') return oid.getTimestamp().getTime();
  return Number.MAX_SAFE_INTEGER;
}

export function rowId(doc: CatalogDoc): string {
  return text(doc.id) || String(doc._id ?? '');
}

/** The older row of a group (the one links most likely point at); ties by id so the result is stable. */
export function olderRow<T extends CatalogDoc>(group: T[]): T {
  return [...group].sort((a, b) => createdTime(a) - createdTime(b) || rowId(a).localeCompare(rowId(b)))[0];
}
