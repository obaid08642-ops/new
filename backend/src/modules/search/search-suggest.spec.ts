import { SearchService, suggestMinLength } from './search.service';
import { normalizeSearchText } from '../seo-search/seo-search.module';

/** A search_index row as the index stores it (only the fields suggest reads). */
function row(id: string, type: string, names: Record<string, string>, extra: Record<string, unknown> = {}) {
  const name_text = Object.values(names).map(normalizeSearchText).join(' | ');
  return { id, type, section: type === 'medicine' ? 'pharmacy' : null, names, name_text, text: name_text, boost: 0, slug: null, code: null, ...extra };
}

/** The two collections suggest reads: search_index (find with a regex on name_text) and featureflags (the kill switch). */
function service(rows: any[], flags: Record<string, boolean> = {}) {
  const asked: any[] = [];
  const conn: any = {
    collection: (name: string) => {
      if (name === 'featureflags') return { findOne: async (q: any) => (q.key.$eq in flags ? { key: q.key.$eq, enabled: flags[q.key.$eq] } : null) };
      return {
        find: (filter: any) => {
          asked.push(filter);
          const found = rows.filter((r) => filter.name_text.test(r.name_text));
          const cursor = { limit: () => cursor, maxTimeMS: () => cursor, toArray: async () => found };
          return cursor;
        },
      };
    },
  };
  return { svc: new SearchService(conn), asked };
}

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
    // a name that starts with "بر" (the more popular first, then the shorter), then a name with it in a later word
    expect(two).toEqual(['بروفينال 400', 'بروف 600', 'برامج التغذية', 'شراب بروف للأطفال']);
    const four = (await svc.suggest('بروفي', 'ar')).suggestions.map((s) => s.name);
    expect(four).toEqual(['بروفينال 400']);
  });

  it('carries what the clients link with: the slug of a medicine and the code of a specialty, in the asked locale', async () => {
    const { svc } = service(rows);
    const out = (await svc.suggest('nu', 'en')).suggestions;
    expect(out).toEqual([{ id: 's-1', type: 'specialty', section: null, name: 'Nutrition programs', name_locale: 'en', slug: null, code: 'nutrition' }]);
    const med = (await svc.suggest('bruf 6', 'en')).suggestions;
    expect(med).toEqual([{ id: 'm-1', type: 'medicine', section: 'pharmacy', name: 'Bruf 600', name_locale: 'en', slug: 'bruf-600', code: null }]);
  });

  it('the search suggestions kill switch answers no suggestions and says it is off', async () => {
    const { svc, asked } = service(rows, { search_suggestions_enabled: false });
    expect(await svc.suggest('بر', 'ar')).toEqual({ suggestions: [], disabled: true });
    expect(asked).toEqual([]);
    const on = service(rows, { search_suggestions_enabled: true });
    expect((await on.svc.suggest('بر', 'ar')).disabled).toBeUndefined();
  });
});
