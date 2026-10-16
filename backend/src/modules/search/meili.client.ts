/**
 * D-29: the self-hosted Meilisearch engine, over its HTTP API (no SDK dependency). Configured by
 * MEILI_URL (+ MEILI_MASTER_KEY); when it is unset or unreachable the search answers from MongoDB.
 */
import { MULTILINGUAL_SYNONYM_MAP, normalizeSearchText } from '../seo-search/seo-search.module';
import { SearchDocument, SearchType } from './search-documents';

export const MEILI_INDEX = 'nabd_search';

export interface MeiliHit extends SearchDocument {
  _formatted?: Record<string, unknown>;
}

type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any>; text(): Promise<string> }>;

/** Every synonym variant maps to the other variants of its group (Meilisearch synonyms are one-way). */
export function meiliSynonyms(): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const entry of MULTILINGUAL_SYNONYM_MAP) {
    const variants = [...new Set(entry.variants.map(normalizeSearchText).filter(Boolean))];
    for (const v of variants) {
      out[v] ??= new Set();
      for (const o of variants) if (o !== v) out[v].add(o);
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
}

/**
 * Index settings. The ranking rules are Meilisearch's relevance rules only: no popularity, sponsorship or
 * custom rule, so a prescription-only item is never promoted (decision 29).
 */
export function meiliSettings() {
  return {
    searchableAttributes: ['names.ar', 'names.en', 'names.ur', 'names.hi', 'names.bn', 'names.fil', 'text'],
    filterableAttributes: ['type', 'section'],
    displayedAttributes: ['key', 'id', 'type', 'section', 'names', 'slug', 'price', 'specialty', 'code', 'requires_prescription', 'online_exclusive'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'exactness'],
    typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
    synonyms: meiliSynonyms(),
  };
}

export class MeiliClient {
  constructor(
    private readonly url: string,
    private readonly key: string | undefined,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
  ) {}

  static fromEnv(): MeiliClient | null {
    const url = (process.env.MEILI_URL || '').trim().replace(/\/+$/, '');
    return url ? new MeiliClient(url, process.env.MEILI_MASTER_KEY || undefined) : null;
  }

  private async req(method: string, path: string, body?: unknown): Promise<any> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.key) headers.authorization = `Bearer ${this.key}`;
    const res = await this.fetchImpl(`${this.url}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`meilisearch ${method} ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }

  async ensureIndex(): Promise<void> {
    await this.req('POST', '/indexes', { uid: MEILI_INDEX, primaryKey: 'key' }).catch((e: Error) => {
      if (!/index_already_exists|409/.test(e.message)) throw e;
    });
    await this.req('PATCH', `/indexes/${MEILI_INDEX}/settings`, meiliSettings());
  }

  async upsert(docs: SearchDocument[]): Promise<void> {
    if (docs.length) await this.req('POST', `/indexes/${MEILI_INDEX}/documents`, docs);
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length) await this.req('POST', `/indexes/${MEILI_INDEX}/documents/delete-batch`, keys);
  }

  async clear(): Promise<void> {
    await this.req('DELETE', `/indexes/${MEILI_INDEX}/documents`);
  }

  /** One query per type (home groups, or the types of one section), in one round trip. */
  async search(q: string, types: SearchType[], limit: number, highlight: string[]): Promise<Record<string, MeiliHit[]>> {
    const queries = types.map((t) => ({
      indexUid: MEILI_INDEX, q, limit, filter: `type = "${t}"`,
      attributesToHighlight: highlight, highlightPreTag: '<mark>', highlightPostTag: '</mark>',
    }));
    const r = await this.req('POST', '/multi-search', { queries });
    const out: Record<string, MeiliHit[]> = {};
    (r?.results || []).forEach((res: any, i: number) => { out[types[i]] = res?.hits || []; });
    return out;
  }
}
