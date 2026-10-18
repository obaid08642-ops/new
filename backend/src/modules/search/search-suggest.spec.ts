import { lastValueFrom, of } from 'rxjs';
import { SearchService, suggestMinLength } from './search.service';
import { normalizeSearchText } from '../seo-search/seo-search.module';
import { MeiliClient } from './meili.client';
import { foldWithMap, highlightRanges, judgeSuggestion } from './suggest-rank';
import { SearchController, SUGGEST_CACHE_CONTROL } from './search.controller';
import { CacheControlInterceptor } from '../../common/cache-control.interceptor';
import { PUBLIC_CACHE_KEY, PublicCacheOptions } from '../../common/public-cache.decorator';
import { toSearchDocument } from './search-documents';

/** A search_index row as the index stores it (the fields suggest reads). `text` is the normalised names + extras. */
function row(id: string, type: string, names: Record<string, string>, extra: Record<string, unknown> = {}) {
  const text = Object.values(names).map(normalizeSearchText).join(' | ');
  return { key: `${type}-${id}`, id, type, section: type === 'medicine' ? 'pharmacy' : null, names, text, boost: 0, slug: null, code: null, ...extra };
}

/**
 * The collections suggest reads: search_index (find with a `text` regex, an optional `key.$nin` exclusion, sort by boost,
 * limit) and featureflags (the kill switch). `asked` records every search_index filter.
 */
function service(rows: any[], flags: Record<string, boolean> = {}, purgeBus?: { purge: (tags: string[]) => Promise<void> }) {
  const asked: any[] = [];
  const conn: any = {
    collection: (name: string) => {
      if (name === 'featureflags') return { findOne: async (q: any) => (q.key.$eq in flags ? { key: q.key.$eq, enabled: flags[q.key.$eq] } : null) };
      return {
        find: (filter: any) => {
          asked.push(filter);
          let n = Infinity;
          const matches = () => rows
            .filter((r) => !filter.key?.$nin?.includes(r.key) && (!filter.text || filter.text.test(r.text)))
            .sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0));
          const cursor: any = {
            sort: () => cursor,
            limit: (k: number) => { n = k; return cursor; },
            maxTimeMS: () => cursor,
            toArray: async () => matches().slice(0, n),
          };
          return cursor;
        },
        bulkWrite: async () => ({}),
      };
    },
  };
  return { svc: new SearchService(conn, purgeBus as any), asked };
}

const names = (items: Array<{ name: string }>) => items.map((s) => s.name);

// The MongoDB paths run unless a test sets MEILI_URL itself (the Meilisearch describe below does).
beforeEach(() => { delete process.env.MEILI_URL; });

describe('issue 1544: instant search suggestions', () => {
  const rows = [
    row('m-2', 'medicine', { ar: 'بروفينال 400', en: 'Brufinal 400' }, { slug: 'brufinal-400', boost: 2 }),
    row('m-1', 'medicine', { ar: 'بروف 600', en: 'Bruf 600' }, { slug: 'bruf-600' }),
    row('m-3', 'medicine', { ar: 'شراب بروف للأطفال', en: 'Bruf syrup kids' }, { slug: 'bruf-syrup' }),
    row('s-1', 'specialty', { ar: 'برامج التغذية', en: 'Nutrition programs' }, { code: 'nutrition' }),
  ];

  it('starts from the first letter in Arabic script and from two letters in other scripts', () => {
    expect(suggestMinLength('ب')).toBe(1);
    expect(suggestMinLength('پ')).toBe(1); // Urdu
    expect(suggestMinLength('b')).toBe(2);
    expect(suggestMinLength('ब')).toBe(2);
  });

  it('answers one Arabic letter, but not one Latin letter', async () => {
    const { svc } = service(rows);
    expect((await svc.suggest('ب', 'ar')).suggestions.length).toBe(4);
    const latin = service(rows);
    expect((await latin.svc.suggest('b', 'en')).suggestions).toEqual([]);
    expect(latin.asked).toEqual([]);
  });

  it('ranks a name that starts with the text above a later word, and narrows as the text grows', async () => {
    const { svc } = service(rows);
    const two = (await svc.suggest('بر', 'ar')).suggestions.map((s) => s.name);
    // starts with "بر" (the more popular first, then the shorter), then a name with it in a later word
    expect(two).toEqual(['بروفينال 400', 'بروف 600', 'برامج التغذية', 'شراب بروف للأطفال']);
    const four = (await svc.suggest('بروفي', 'ar')).suggestions.map((s) => s.name);
    expect(four).toEqual(['بروفينال 400']);
  });

  it('carries what the clients link with, in the asked locale, and the highlight of the match', async () => {
    const { svc } = service(rows);
    const out = (await svc.suggest('nu', 'en')).suggestions;
    expect(out).toEqual([{ id: 's-1', type: 'specialty', section: null, name: 'Nutrition programs', name_locale: 'en', highlights: [{ start: 0, length: 2 }], slug: null, code: 'nutrition' }]);
    const med = (await svc.suggest('bruf 6', 'en')).suggestions;
    expect(med).toEqual([{ id: 'm-1', type: 'medicine', section: 'pharmacy', name: 'Bruf 600', name_locale: 'en', highlights: [{ start: 0, length: 6 }], slug: 'bruf-600', code: null }]);
  });

  it('the search suggestions kill switch answers no suggestions and says it is off', async () => {
    const { svc, asked } = service(rows, { search_suggestions_enabled: false });
    expect(await svc.suggest('بر', 'ar')).toEqual({ suggestions: [], disabled: true });
    expect(asked).toEqual([]);
    const on = service(rows, { search_suggestions_enabled: true });
    expect((await on.svc.suggest('بر', 'ar')).disabled).toBeUndefined();
  });
});

describe('issue 1544: three match tiers (prefix, later word, inside a word)', () => {
  it('"ban" shows the name that starts with it, then a later word, then a name with it inside a word', async () => {
    const { svc } = service([
      row('u', 'medicine', { en: 'Urban Clinic' }, { boost: 9 }),
      row('b', 'medicine', { en: 'Banadol Extra' }),
      row('n', 'medicine', { en: 'X Banana' }),
    ]);
    expect(names((await svc.suggest('ban', 'en')).suggestions)).toEqual(['Banadol Extra', 'X Banana', 'Urban Clinic']);
  });

  it('within one tier: popularity first, then the shorter name', async () => {
    const { svc } = service([
      row('a', 'medicine', { en: 'Panadol Extra' }, { boost: 1 }),
      row('b', 'medicine', { en: 'Panadol' }, { boost: 1 }),
      row('c', 'medicine', { en: 'Panadol Forte' }, { boost: 2 }),
    ]);
    expect(names((await svc.suggest('pan', 'en')).suggestions)).toEqual(['Panadol Forte', 'Panadol', 'Panadol Extra']);
  });

  it('the inside-a-word query runs only when the first tiers are short of the limit (8)', async () => {
    const many = Array.from({ length: 9 }, (_, i) => row(`p${i}`, 'medicine', { en: `Ban ${i}` }));
    const full = service(many);
    const out = (await full.svc.suggest('ban', 'en')).suggestions;
    expect(out).toHaveLength(8);
    expect(full.asked).toHaveLength(1);
    expect(full.asked[0].key).toBeUndefined();

    const short = service([row('p', 'medicine', { en: 'Ban 1' }), row('q', 'medicine', { en: 'Urban 2' })]);
    expect(names((await short.svc.suggest('ban', 'en')).suggestions)).toEqual(['Ban 1', 'Urban 2']);
    expect(short.asked).toHaveLength(2);
    expect(short.asked[1].key).toEqual({ $nin: expect.any(Array) });
  });

  it('matches the name in every locale the index stores, and shows the locale that matched with its highlight', async () => {
    const { svc } = service([row('b', 'medicine', { ar: 'بنادول', en: 'Banadol' })]);
    const out = (await svc.suggest('ban', 'ar')).suggestions;
    expect(out).toEqual([expect.objectContaining({ name: 'Banadol', name_locale: 'en', highlights: [{ start: 0, length: 3 }] })]);
  });

  it('matches the active ingredient and the synonyms, after every name match', async () => {
    const { svc } = service([
      row('i', 'medicine', { en: 'Calpol' }, { text: 'calpol | paracetamol' }),
      row('n', 'medicine', { en: 'Paracetamol Plus' }),
    ]);
    const out = (await svc.suggest('para', 'en')).suggestions;
    expect(names(out)).toEqual(['Paracetamol Plus', 'Calpol']);
    expect(out[1].highlights).toEqual([]);
  });
});

describe('issue 1544: highlight ranges', () => {
  it('Arabic: a match ignores diacritics and the alef, hamza, ya and ta marbuta variants', () => {
    expect(highlightRanges('أسبرين 500', 'اسبر')).toEqual([{ start: 0, length: 4 }]);
    expect(highlightRanges('إسبرين', 'سبر')).toEqual([{ start: 1, length: 3 }]);
    expect(highlightRanges('بُروف 600', 'بروف')).toEqual([{ start: 0, length: 5 }]); // the diacritic is inside the range
    expect(highlightRanges('بروفة', 'بروفه')).toEqual([{ start: 0, length: 5 }]);
    expect(highlightRanges('فينال', 'فينال')).toEqual([{ start: 0, length: 5 }]);
  });

  it('English: ignores case, and highlights a match inside a word', () => {
    expect(highlightRanges('Bruf 600', 'BRU')).toEqual([{ start: 0, length: 3 }]);
    expect(highlightRanges('Super Bruf', 'ruf')).toEqual([{ start: 7, length: 3 }]);
    expect(highlightRanges('Bruf bruf', 'bruf')).toEqual([{ start: 0, length: 4 }, { start: 5, length: 4 }]);
    expect(highlightRanges('Panadol', 'zz')).toEqual([]);
    expect(highlightRanges('Panadol', '   ')).toEqual([]);
  });

  it('the folding maps back to the original text for every normalised letter', () => {
    for (const s of ['أ إ آ ٱ ا', 'ى ي ی', 'ة ه', 'بُرُوفْ ـ', 'Crème BRÛLÉE  2', 'پیناڈول']) {
      expect(foldWithMap(s).text).toBe(normalizeSearchText(s));
    }
  });

  it('judges the match on the name shown: a better match in another locale is shown and highlighted', () => {
    const judged = judgeSuggestion({ key: 'medicine-b', id: 'b', type: 'medicine', names: { ar: 'شراب بنادول', en: 'Banadol' } }, 'ban', 'ar', false);
    expect(judged).toEqual({ tier: 1, name: 'Banadol', name_locale: 'en', highlights: [{ start: 0, length: 3 }] });
  });
});

describe('issue 1544: Meilisearch path (prefix search, typo tolerance) and the MongoDB fallback', () => {
  const env = process.env.MEILI_URL;
  beforeEach(() => { process.env.MEILI_URL = 'http://meili:7700'; });
  afterEach(() => {
    jest.restoreAllMocks();
    if (env === undefined) delete process.env.MEILI_URL; else process.env.MEILI_URL = env;
  });

  const hit = (id: string, en: string, boost = 0) => {
    const { text: _text, ...displayed } = row(id, 'medicine', { en }, { boost });
    return displayed;
  };

  it('asks Meilisearch first: the ranking and the highlights come from the server, not from Meilisearch', async () => {
    const spy = jest.spyOn(MeiliClient.prototype, 'suggest').mockResolvedValue([hit('u', 'Urban Clinic', 9), hit('b', 'Banadol Extra')] as any);
    const { svc, asked } = service([]);
    const out = (await svc.suggest('ban', 'en')).suggestions;
    expect(spy).toHaveBeenCalledWith('ban', 200);
    expect(names(out)).toEqual(['Banadol Extra', 'Urban Clinic']);
    expect(out[0].highlights).toEqual([{ start: 0, length: 3 }]);
    // no MongoDB prefix pool: the only MongoDB query is the bounded inside-a-word one (fewer than 8 first-tier answers)
    expect(asked.every((f) => f.key !== undefined)).toBe(true);
    expect(asked).toHaveLength(1);
  });

  it('a typo that Meilisearch corrects is still suggested (typo tolerance), with no highlight it cannot place', async () => {
    jest.spyOn(MeiliClient.prototype, 'suggest').mockResolvedValue([hit('m', 'Bruf 600')] as any);
    const { svc } = service([]);
    const out = (await svc.suggest('brufn', 'en')).suggestions;
    expect(names(out)).toEqual(['Bruf 600']);
    expect(out[0].highlights).toEqual([]);
  });

  it('answers from MongoDB when Meilisearch fails, with the same ranking and highlights', async () => {
    jest.spyOn(MeiliClient.prototype, 'suggest').mockRejectedValue(new Error('down'));
    const docs = [row('u', 'medicine', { en: 'Urban Clinic' }, { boost: 9 }), row('b', 'medicine', { en: 'Banadol Extra' }), row('n', 'medicine', { en: 'X Banana' })];
    const out = (await service(docs).svc.suggest('ban', 'en')).suggestions;
    expect(out.map((s) => [s.name, s.highlights])).toEqual([
      ['Banadol Extra', [{ start: 0, length: 3 }]],
      ['X Banana', [{ start: 2, length: 3 }]],
      ['Urban Clinic', [{ start: 2, length: 3 }]],
    ]);
  });

  it('without MEILI_URL the MongoDB path answers and Meilisearch is never asked', async () => {
    delete process.env.MEILI_URL;
    const spy = jest.spyOn(MeiliClient.prototype, 'suggest');
    const out = (await service([row('b', 'medicine', { en: 'Banadol' })]).svc.suggest('ban', 'en')).suggestions;
    expect(names(out)).toEqual(['Banadol']);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('issue 1544: indexes of search_index', () => {
  it('the worker ensures an index on boost: the suggestions sort by it before their limit', async () => {
    const prevRole = process.env.PROCESS_ROLE;
    process.env.PROCESS_ROLE = 'worker';
    const created: unknown[] = [];
    const conn: any = {
      watch: () => { throw new Error('no change streams'); },
      collection: () => ({
        createIndex: async (spec: unknown) => { created.push(spec); return 'ok'; },
        findOne: async () => ({ version: 3 }),
        estimatedDocumentCount: async () => 1,
        find: () => ({ [Symbol.asyncIterator]: async function* () { /* no rows */ } }),
      }),
    };
    const svc = new SearchService(conn);
    try {
      await svc.onApplicationBootstrap();
      expect(created).toEqual(expect.arrayContaining([{ key: 1 }, { src: 1 }, { type: 1 }, { boost: -1 }]));
    } finally {
      await svc.onModuleDestroy();
      if (prevRole === undefined) delete process.env.PROCESS_ROLE; else process.env.PROCESS_ROLE = prevRole;
    }
  });
});

describe('issue 1544: edge cache and purge', () => {
  it('the suggest route is public for anonymous requests, with the owner header and the search tag', () => {
    const meta = Reflect.getMetadata(PUBLIC_CACHE_KEY, SearchController.prototype.suggest) as PublicCacheOptions;
    expect(meta).toMatchObject({ ttl: 3600, tags: ['search'], varyLanguage: false, cacheControl: SUGGEST_CACHE_CONTROL });
    expect(SUGGEST_CACHE_CONTROL).toBe('public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  });

  async function headersFor(req: { method: string; headers: Record<string, string> }) {
    const reflector = { get: (key: string, target: any) => Reflect.getMetadata(key, target) } as any;
    const interceptor = new CacheControlInterceptor(reflector);
    const res = { headersSent: false, setHeader: jest.fn() };
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
      getHandler: () => SearchController.prototype.suggest,
      getClass: () => SearchController,
    };
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of({ suggestions: [] }) }));
    return res.setHeader.mock.calls;
  }

  it('sends the owner Cache-Control and the Cache-Tag to anonymous requests', async () => {
    const calls = await headersFor({ method: 'GET', headers: {} });
    expect(calls).toEqual(expect.arrayContaining([
      ['Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'],
      ['Cache-Tag', 'search'],
    ]));
  });

  it('a signed-in request (Authorization or a cookie) is never shared: private, no-store', async () => {
    expect(await headersFor({ method: 'GET', headers: { authorization: 'Bearer x' } })).toContainEqual(['Cache-Control', 'private, no-store']);
    expect(await headersFor({ method: 'GET', headers: { cookie: 'sid=1' } })).toContainEqual(['Cache-Control', 'private, no-store']);
  });

  it('a catalogue write purges the search tag once, 500 ms after the last write of the burst', async () => {
    jest.useFakeTimers();
    try {
      const purge = jest.fn().mockResolvedValue(undefined);
      const { svc } = service([], {}, { purge });
      const doc = toSearchDocument('specialties', { _id: 's1', id: 's1', name_en: 'Dermatology', active: true });
      expect(doc).not.toBeNull();
      await svc.applyChange('specialties', 's1', { _id: 's1', id: 's1', name_en: 'Dermatology', active: true });
      await svc.applyChange('specialties', 's2', { _id: 's2', id: 's2', name_en: 'Cardiology', active: true });
      expect(purge).not.toHaveBeenCalled();
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      expect(purge).toHaveBeenCalledTimes(1);
      expect(purge).toHaveBeenCalledWith(['search']);
    } finally {
      jest.useRealTimers();
    }
  });
});
