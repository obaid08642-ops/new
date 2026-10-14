/**
 * D-29 (owner decision 29): search.
 * - MongoDB is the source of truth. `search_index` holds one document per searchable item, rebuilt from
 *   the source collections and kept in sync by a change stream on them (a write by any code path, or
 *   directly in the database, reaches the search). Without a replica set it falls back to polling.
 * - Meilisearch (MEILI_URL) mirrors `search_index` and answers queries; when it is unset or fails, the
 *   same rules are answered from `search_index` in MongoDB.
 */
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { expandMultilingualSearchTerms, normalizeSearchText } from '../seo-search/seo-search.module';
import {
  SEARCH_SOURCES, SEARCH_TYPES, SECTION_TYPES, SearchDocument, SearchLocale, SearchSection, SearchSource, SearchType,
  displayName, escapeRegex, sourceFilter, textScore, toSearchDocument, tolerantPattern,
} from './search-documents';
import { MeiliClient } from './meili.client';

export const SEARCH_INDEX = 'search_index';
const META = 'search_index_meta';
/** Bump when the document shape changes: the index is rebuilt at the next boot. */
const INDEX_VERSION = 1;
const BATCH = 500;

export interface SearchItem {
  id: string;
  type: SearchType;
  section: SearchSection | null;
  name: string;
  name_locale: SearchLocale;
  highlight?: string;
  slug?: string | null;
  price?: number | null;
  specialty?: string | null;
  code?: string | null;
  requires_prescription: boolean;
}

@Injectable()
export class SearchService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger('Search');
  private readonly meili = MeiliClient.fromEnv();
  private meiliReady = false;
  private stream: any = null;
  private poller: NodeJS.Timeout | null = null;
  private retry: NodeJS.Timeout | null = null;
  private stopped = false;
  private lastPoll = new Date();

  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get index() {
    return this.conn.collection(SEARCH_INDEX);
  }

  async onApplicationBootstrap() {
    if (process.env.SEARCH_SYNC === 'off') return;
    await this.index.createIndex({ key: 1 }, { unique: true }).catch(() => null);
    await this.index.createIndex({ src: 1 }).catch(() => null);
    await this.index.createIndex({ type: 1 }).catch(() => null);
    this.watch();
    // The rebuild runs in the background: the API starts at once and answers from what is indexed.
    void this.bootRebuild();
  }

  async onModuleDestroy() {
    this.stopped = true;
    if (this.poller) clearInterval(this.poller);
    if (this.retry) clearTimeout(this.retry);
    await this.stream?.close().catch(() => null);
  }

  private async bootRebuild() {
    try {
      const meta: any = await this.conn.collection(META).findOne({ _id: 'search' as any });
      const count = await this.index.estimatedDocumentCount();
      if (meta?.version !== INDEX_VERSION || count === 0) await this.rebuild();
      else if (this.meili) await this.syncMeiliFromIndex();
    } catch (e) {
      this.log.warn(`boot rebuild failed: ${(e as Error).message}`);
    }
  }

  /** Re-creates the whole index from the source collections. */
  async rebuild(): Promise<{ indexed: number }> {
    const started = new Date();
    let indexed = 0;
    for (const source of SEARCH_SOURCES) {
      const cursor = this.conn.collection(source).find(sourceFilter(source) as any);
      let batch: SearchDocument[] = [];
      for await (const raw of cursor) {
        const doc = toSearchDocument(source, raw);
        if (doc) batch.push(doc);
        if (batch.length >= BATCH) { indexed += await this.write(batch); batch = []; }
      }
      if (batch.length) indexed += await this.write(batch);
    }
    // Anything not rewritten by this run is no longer searchable.
    const stale = await this.index.find({ indexed_at: { $lt: started } }, { projection: { key: 1 } }).toArray();
    if (stale.length) {
      await this.index.deleteMany({ indexed_at: { $lt: started } });
      await this.meiliCall((m) => m.remove(stale.map((s: any) => s.key)));
    }
    await this.conn.collection(META).updateOne({ _id: 'search' as any }, { $set: { version: INDEX_VERSION, rebuilt_at: new Date(), indexed } }, { upsert: true });
    this.log.log(`search index rebuilt: ${indexed} documents`);
    return { indexed };
  }

  private async write(docs: SearchDocument[]): Promise<number> {
    const now = new Date();
    await this.index.bulkWrite(docs.map((d) => ({ replaceOne: { filter: { key: d.key }, replacement: { ...d, indexed_at: now }, upsert: true } })), { ordered: false });
    await this.meiliCall((m) => m.upsert(docs));
    return docs.length;
  }

  private async syncMeiliFromIndex() {
    const cursor = this.index.find({}, { projection: { _id: 0, indexed_at: 0 } });
    let batch: SearchDocument[] = [];
    for await (const d of cursor) {
      batch.push(d as unknown as SearchDocument);
      if (batch.length >= BATCH) { await this.meiliCall((m) => m.upsert(batch)); batch = []; }
    }
    if (batch.length) await this.meiliCall((m) => m.upsert(batch));
  }

  /** Meilisearch is a mirror: a failure is logged and the MongoDB index stays correct. */
  private async meiliCall(fn: (m: MeiliClient) => Promise<unknown>): Promise<boolean> {
    if (!this.meili) return false;
    try {
      if (!this.meiliReady) { await this.meili.ensureIndex(); this.meiliReady = true; }
      await fn(this.meili);
      return true;
    } catch (e) {
      this.meiliReady = false;
      this.log.warn(`meilisearch: ${(e as Error).message}`);
      return false;
    }
  }

  /** Applies one source record (after a change): upsert when searchable, remove otherwise. */
  async applyChange(source: SearchSource, _id: unknown, raw: any | null) {
    const src = `${source}:${String(_id)}`;
    const doc = raw ? toSearchDocument(source, raw) : null;
    const old = await this.index.find({ src }, { projection: { key: 1 } }).toArray();
    const gone = old.map((o: any) => o.key).filter((k: string) => k !== doc?.key);
    if (gone.length) {
      await this.index.deleteMany({ key: { $in: gone } });
      await this.meiliCall((m) => m.remove(gone));
    }
    if (doc) await this.write([doc]);
  }

  private watch() {
    if (this.stopped) return;
    try {
      const pipeline = [{ $match: { 'ns.coll': { $in: [...SEARCH_SOURCES] } } }];
      const stream = this.conn.watch(pipeline, { fullDocument: 'updateLookup' });
      this.stream = stream;
      stream.on('change', (ev: any) => {
        const source = ev?.ns?.coll as SearchSource;
        const _id = ev?.documentKey?._id;
        if (!source || _id === undefined) return;
        this.applyChange(source, _id, ev.operationType === 'delete' ? null : ev.fullDocument ?? null)
          .catch((e) => this.log.warn(`search sync ${source}: ${(e as Error).message}`));
      });
      stream.on('error', (e: Error) => {
        void stream.close().catch(() => null);
        this.stream = null;
        if (/replica set|change stream|not supported|\$changeStream/i.test(e.message)) {
          this.log.warn('change streams unavailable: search sync polls every 30 s');
          this.startPolling();
        } else if (!this.stopped) {
          this.retry = setTimeout(() => this.watch(), 5000);
          this.retry.unref?.();
        }
      });
    } catch {
      this.startPolling();
    }
  }

  /** Fallback without a replica set: re-applies the records changed since the last poll. */
  private startPolling() {
    if (this.poller || this.stopped) return;
    this.poller = setInterval(() => { void this.pollOnce(); }, 30_000);
    this.poller.unref?.();
  }

  private async pollOnce() {
    const since = this.lastPoll;
    this.lastPoll = new Date();
    for (const source of SEARCH_SOURCES) {
      const rows = await this.conn.collection(source).find({ $or: [{ updatedAt: { $gte: since } }, { updated_at: { $gte: since } }] } as any).limit(5000).toArray().catch(() => []);
      for (const raw of rows) await this.applyChange(source, raw._id, raw).catch(() => null);
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────────────────────────────

  async search(q: string, opts: { section?: SearchSection; locale?: SearchLocale; limit?: number }) {
    const locale = opts.locale || 'ar';
    const query = normalizeSearchText(q || '').slice(0, 120);
    const types = opts.section ? SECTION_TYPES[opts.section] : SEARCH_TYPES;
    const limit = Math.min(Math.max(opts.limit || (opts.section ? 20 : 5), 1), 50);
    if (!query) return opts.section ? { query, section: opts.section, engine: 'none', items: [] } : { query, engine: 'none', groups: [] };

    let engine: 'meilisearch' | 'mongo' = 'mongo';
    let byType: Record<string, SearchItem[]> | null = null;
    if (this.meili) {
      try {
        const hits = await this.meili.search(query, types, limit, [`names.${locale}`]);
        byType = Object.fromEntries(Object.entries(hits).map(([t, list]) => [t, list.map((h) => this.toItem(h, locale, (h._formatted as any)?.names?.[locale]))]));
        engine = 'meilisearch';
      } catch (e) {
        this.log.warn(`meilisearch query failed, answering from MongoDB: ${(e as Error).message}`);
      }
    }
    if (!byType) byType = await this.mongoSearch(query, types, limit, locale);

    if (opts.section) {
      // One section: its types merged, in relevance order within each type and type order across them.
      const items = types.flatMap((t) => byType![t] || []).slice(0, limit);
      return { query, section: opts.section, engine, items };
    }
    const groups = types
      .map((t) => ({ type: t, section: (byType![t]?.[0]?.section) ?? null, items: byType![t] || [] }))
      .filter((g) => g.items.length > 0);
    return { query, engine, groups };
  }

  async suggest(q: string, locale: SearchLocale = 'ar') {
    const query = normalizeSearchText(q || '').slice(0, 60);
    if (query.length < 2) return { suggestions: [] };
    const rx = new RegExp(`(^| )${escapeRegex(query)}`);
    const rows = await this.index.find({ name_text: rx }, { projection: { _id: 0, id: 1, type: 1, names: 1, boost: 1 } }).sort({ boost: -1 }).limit(8).toArray();
    return { suggestions: rows.map((r: any) => ({ id: r.id, type: r.type, ...displayName(r, locale) })) };
  }

  private async mongoSearch(query: string, types: SearchType[], limit: number, locale: SearchLocale): Promise<Record<string, SearchItem[]>> {
    const terms = [...new Set([query, ...expandMultilingualSearchTerms(query)])].filter(Boolean);
    const contains = { $or: terms.map((t) => ({ text: { $regex: escapeRegex(t) } })) };
    const out: Record<string, SearchItem[]> = {};
    await Promise.all(types.map(async (type) => {
      let rows: any[] = await this.index.find({ type, ...contains }, { projection: { _id: 0 } }).limit(200).maxTimeMS(5000).toArray();
      if (!rows.length && query.replace(/\s+/g, '').length >= 4) {
        rows = await this.index.find({ type, text: { $regex: tolerantPattern(query) } }, { projection: { _id: 0 } }).limit(100).maxTimeMS(5000).toArray();
      }
      rows.sort((a, b) => (textScore(b, terms) + b.boost) - (textScore(a, terms) + a.boost)
        || Number(a.requires_prescription) - Number(b.requires_prescription)
        || String(a.id).localeCompare(String(b.id)));
      out[type] = rows.slice(0, limit).map((r) => this.toItem(r, locale));
    }));
    return out;
  }

  private toItem(doc: SearchDocument, locale: SearchLocale, highlight?: unknown): SearchItem {
    return {
      id: doc.id,
      type: doc.type,
      section: doc.section,
      ...displayName(doc, locale),
      ...(typeof highlight === 'string' && highlight.includes('<mark>') ? { highlight } : {}),
      slug: doc.slug ?? null,
      price: doc.price ?? null,
      specialty: doc.specialty ?? null,
      code: doc.code ?? null,
      requires_prescription: doc.requires_prescription === true,
    };
  }
}
