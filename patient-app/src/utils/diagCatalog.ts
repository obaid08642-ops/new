import { diagArtKey, type DiagArtKey, type DiagKind } from '../../../packages/ui/icons/diag-art';
import type { CatalogItem } from './labMappers';

/**
 * The hub's catalogue helpers (owner review G4): which category illustration an item gets, and when a scroll has reached the end of the list.
 * The grouping itself (`diagArtKey`, `filterByArt`, `mostRequested`) is the shared module packages/ui/icons/diag-art.ts, the same on the web.
 */
export function catalogArt(kind: DiagKind, item: Pick<CatalogItem, 'name' | 'category' | 'sampleType' | 'modality' | 'bodyPart' | 'allNames'>): DiagArtKey {
  return diagArtKey({ kind, category: item.category, sampleType: item.sampleType, modality: item.modality, bodyPart: item.bodyPart, names: [item.name, ...item.allNames] });
}

/** True when the visible window is within `threshold` points of the end of the content (a ScrollView's onScroll event, in place of a list's onEndReached). */
export function isNearEnd(m: { layoutHeight: number; contentHeight: number; offsetY: number }, threshold = 500): boolean {
  return m.contentHeight > 0 && m.layoutHeight > 0 && m.offsetY + m.layoutHeight >= m.contentHeight - threshold;
}

/** The rating of a card, or null: shown only for a rating above 0 with its count above 0 (the server sends them for a rated service). */
export function itemRating(item: Pick<CatalogItem, 'rating' | 'ratingCount'>): { rating: number; count: number } | null {
  return item.rating !== null && item.rating > 0 && item.ratingCount > 0 ? { rating: item.rating, count: item.ratingCount } : null;
}
