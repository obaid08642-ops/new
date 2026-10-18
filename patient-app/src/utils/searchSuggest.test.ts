// Instant search suggestions (#1654 rules, as on the website): minimum length, the wait, the abort of the request in
// flight, the kill switch, the highlight and the route of each type.
import {
  SUGGEST_DEBOUNCE_MS,
  SuggestController,
  canSuggest,
  highlightParts,
  parseSuggestions,
  suggestMinLength,
  suggestionRoute,
  type Suggestion,
  type SuggestState,
} from './searchSuggest';

describe('minimum length', () => {
  it('asks from the first letter for Arabic script and from two letters otherwise', () => {
    expect(suggestMinLength('ب')).toBe(1);
    expect(canSuggest('ب')).toBe(true);
    expect(suggestMinLength('pa')).toBe(2);
    expect(canSuggest('p')).toBe(false);
    expect(canSuggest('   ')).toBe(false);
  });
});

describe('parseSuggestions', () => {
  it('keeps known types, drops rows without an id or name, and removes duplicates', () => {
    const { items, disabled } = parseSuggestions({
      suggestions: [
        { id: 'd1', type: 'doctor', name: 'Dr A' },
        { id: 'd1', type: 'doctor', name: 'Dr A' },
        { id: 'x', type: 'unknown', name: 'Nope' },
        { id: '', type: 'article', name: 'No id' },
        { id: 'm1', type: 'medicine', name: 'Adol', slug: 'adol' },
      ],
    });
    expect(disabled).toBe(false);
    expect(items.map((i) => `${i.type}:${i.id}`)).toEqual(['doctor:d1', 'medicine:m1']);
  });

  it('reports the kill switch as disabled with no items', () => {
    expect(parseSuggestions({ suggestions: [], disabled: true })).toEqual({ items: [], disabled: true });
  });
});

describe('highlightParts', () => {
  it('marks the match, ignoring Arabic diacritics and the taa marbuta', () => {
    const parts = highlightParts('مَسْكِن', 'مسكن');
    expect(parts.filter((p) => p.match).map((p) => p.text).join('')).toBe('مَسْكِن');
  });

  it('prefers a match at the start of a word', () => {
    expect(highlightParts('Iron tablets, iron syrup', 'iron')).toEqual([
      { text: 'Iron', match: true },
      { text: ' tablets, iron syrup', match: false },
    ]);
  });

  it('returns the whole name when nothing matches', () => {
    expect(highlightParts('Paracetamol', 'zzz')).toEqual([{ text: 'Paracetamol', match: false }]);
  });
});

describe('suggestionRoute', () => {
  const base: Suggestion = { id: '7', type: 'medicine', name: 'x', slug: null, code: null };

  it('opens a medicine by its slug, else by its id', () => {
    expect(suggestionRoute({ ...base, slug: 'adol' })).toEqual({ pathname: '/p/[slug]', params: { slug: 'adol' } });
    expect(suggestionRoute(base)).toEqual({ pathname: '/medicine/[slug]', params: { slug: '7' } });
  });

  it('opens radiology in the test screen with its radiology mode', () => {
    expect(suggestionRoute({ ...base, type: 'radiology' })).toEqual({
      pathname: '/diagnostics/test-detail',
      params: { id: '7', type: 'radiology' },
    });
  });

  it('returns null for a specialty without a code and an article without a slug', () => {
    expect(suggestionRoute({ ...base, type: 'specialty' })).toBeNull();
    expect(suggestionRoute({ ...base, type: 'article' })).toBeNull();
  });
});

describe('SuggestController', () => {
  function harness(respond: (url: string, signal: AbortSignal) => Promise<Response>) {
    const states: SuggestState[] = [];
    const timers: { fn: () => void; ms: number; handle: number }[] = [];
    let next = 1;
    const controller = new SuggestController({
      baseUrl: 'https://api.test/api/v1',
      locale: 'ur',
      fetcher: (url, init) => respond(url, init.signal),
      onChange: (s) => states.push(s),
      setTimer: (fn, ms) => {
        const handle = next++;
        timers.push({ fn, ms, handle });
        return handle;
      },
      clearTimer: (handle) => {
        const i = timers.findIndex((t) => t.handle === handle);
        if (i !== -1) timers.splice(i, 1);
      },
    });
    const fire = () => {
      const t = timers.shift();
      t?.fn();
    };
    return { controller, states, timers, fire };
  }

  it('waits the debounce before asking, then shows the answer for that text', async () => {
    const requested: string[] = [];
    const h = harness(async (url) => {
      requested.push(url);
      return new Response(JSON.stringify({ suggestions: [{ id: 'd1', type: 'doctor', name: 'Dr' }] }), { status: 200 });
    });
    h.controller.input('dr');
    expect(h.timers[0].ms).toBe(SUGGEST_DEBOUNCE_MS);
    expect(requested).toEqual([]);
    h.fire();
    await new Promise((r) => setTimeout(r, 0));
    expect(requested).toEqual(['https://api.test/api/v1/search/suggest?q=dr&locale=ur']);
    expect(h.controller.current.status).toBe('ready');
    expect(h.controller.current.items.map((i) => i.id)).toEqual(['d1']);
  });

  it('a newer letter cancels the waiting request', () => {
    const h = harness(async () => new Response('{}', { status: 200 }));
    h.controller.input('pa');
    h.controller.input('par');
    expect(h.timers).toHaveLength(1);
  });

  it('turns the list off for the screen when the kill switch answers disabled', async () => {
    const h = harness(async () => new Response(JSON.stringify({ suggestions: [], disabled: true }), { status: 200 }));
    h.controller.input('para');
    h.fire();
    await new Promise((r) => setTimeout(r, 0));
    expect(h.controller.current.status).toBe('off');
    h.controller.input('paracetamol');
    expect(h.timers).toHaveLength(0);
  });
});
