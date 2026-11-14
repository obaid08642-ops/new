/**
 * The search box of the lab, radiology and nursing lists, on the same search stack as the home and pharmacy search (typo tolerance, Arabic / English synonyms), with the old
 * text match kept as the fallback. A list asks `matchedIds` first: when it gets ids, it filters by them and keeps the engine's relevance order unless a sort was asked for.
 */
import type { SearchService } from './search.service';
import type { SearchType } from './search-documents';

export const LAB_TYPES: SearchType[] = ['lab_test', 'lab_package'];
export const RADIOLOGY_TYPES: SearchType[] = ['radiology'];
export const NURSING_TYPES: SearchType[] = ['nursing'];

export async function matchedIds(search: SearchService | undefined, q: unknown, types: SearchType[]): Promise<string[] | null> {
  const text = typeof q === 'string' ? q.trim() : '';
  if (!search || text.length < 2) return null;
  return search.matchIds(text, types);
}

/** Rows in the order of `ids` (the engine's relevance); rows not in the list go last, in their own order. */
export function byRelevance<T extends { id?: unknown }>(rows: T[], ids: string[]): T[] {
  const at = new Map(ids.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (at.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER) - (at.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER));
}
