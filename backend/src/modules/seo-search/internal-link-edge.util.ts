/**
 * 13.R8 — Entity graph: internal links only from real edges.
 *
 * Pure link-generation guard. No DB access here: callers inject
 * existence/history lookups (mocked in specs, real stores in SeoService).
 *
 * A link is emitted ONLY when:
 *  - entity_type is a known public type (no guessed URL namespaces), AND
 *  - target entity exists in the store (no link to missing/deleted), AND
 *  - projection/edge is published + indexable (relationship is live), AND
 *  - slug resolves to the canonical one: stored slug wins over a rebuilt
 *    slug (no guessed URLs); a renamed slug emits only via slug_history
 *    (old → new), otherwise it is dropped.
 */
import { buildSlug } from '../../common/slug.util';

export const SUPPORTED_INTERNAL_LINK_TYPES = new Set([
  'medicine',
  'doctor',
  'lab-service',
  'home-care-service',
  'facility',
  'article',
  // pipeline aliases that resolve to the same public namespaces
  'pharmacy',
  'hospital',
  'clinic',
  'lab',
  'radiology',
  'nursing',
  'service',
  'lab_test',
  'radiology_service',
]);

export interface CandidateInternalLink {
  entity_type?: string | null;
  entity_id?: string | null;
  slug?: string | null;
  indexable?: boolean;
  sitemapIncluded?: boolean;
}

export interface EdgeStore {
  /** Target still present + publicly visible (not deleted/deactivated). */
  sourceExists: (entityType: string, entityId: string) => boolean;
  /** Rename history: old_slug → canonical new_slug, if any. */
  historyNewSlug?: (entityType: string, oldSlug: string) => string | null;
}

/** Prefer the stored canonical slug; rebuild only when nothing stored. */
export function preferredSlug(storedSlug: unknown, name: string, id: string): string {
  if (typeof storedSlug === 'string' && storedSlug.trim().length > 0) return storedSlug.trim();
  return buildSlug(name || 'item', String(id || 'item'));
}

export function isSupportedInternalLinkType(t: unknown): boolean {
  return typeof t === 'string' && SUPPORTED_INTERNAL_LINK_TYPES.has(t);
}

/**
 * Decide a single candidate. Returns the canonical slug to emit,
 * or null when the link must be dropped (dead/guessed/unsupported).
 */
export function decideInternalLink(
  link: CandidateInternalLink,
  store: EdgeStore,
): { emit: boolean; slugToUse: string | null; reason: string } {
  const type = String(link?.entity_type || '');
  const id = String(link?.entity_id || '');
  if (!isSupportedInternalLinkType(type)) return { emit: false, slugToUse: null, reason: 'unsupported_type' };
  if (!id) return { emit: false, slugToUse: null, reason: 'missing_id' };
  if (link?.indexable === false) return { emit: false, slugToUse: null, reason: 'not_indexable' };
  if (link?.sitemapIncluded === false) return { emit: false, slugToUse: null, reason: 'not_included' };
  if (!store.sourceExists(type, id)) return { emit: false, slugToUse: null, reason: 'missing_target' };
  const slug = typeof link?.slug === 'string' ? link.slug.trim() : '';
  if (slug) {
    const fixed = store.historyNewSlug?.(type, slug) || null;
    // Renamed slug with history → emit canonical, never the stale slug.
    if (fixed && fixed !== slug) return { emit: true, slugToUse: fixed, reason: 'renamed_via_history' };
    return { emit: true, slugToUse: slug, reason: 'real_edge' };
  }
  // No slug stored: only emit when history gives us the canonical one.
  // Otherwise we would be guessing a URL.
  return { emit: false, slugToUse: null, reason: 'missing_slug_no_history' };
}

/** Filter a batch of projection-like candidates to real edges only. */
export function filterDeadInternalLinks(
  links: CandidateInternalLink[],
  store: EdgeStore,
): Array<CandidateInternalLink & { slugToUse: string }> {
  const out: Array<CandidateInternalLink & { slugToUse: string }> = [];
  for (const l of links || []) {
    const d = decideInternalLink(l, store);
    if (d.emit && d.slugToUse) out.push({ ...l, slugToUse: d.slugToUse });
  }
  return out;
}
