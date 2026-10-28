import { pendingRequests, PROVIDER_VARIABLES, rejectionOf, translateProviders } from './translate-product-content';

describe('translate-product-content run batches', () => {
  const reqs = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));

  it('sends only the requests without an answer, at most `max`', () => {
    expect(pendingRequests(reqs, new Set(['a', 'c']), 2).map((r) => r.id)).toEqual(['b', 'd']);
    expect(pendingRequests(reqs, new Set(['a', 'c'])).map((r) => r.id)).toEqual(['b', 'd', 'e']);
    expect(pendingRequests(reqs, new Set(reqs.map((r) => r.id)), 10)).toEqual([]);
    expect(pendingRequests(reqs, new Set(), 0)).toEqual([]);
  });

  it('names every provider variable of the gateway chain, never Replicate', () => {
    expect(PROVIDER_VARIABLES).toEqual(expect.arrayContaining(['GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY']));
    expect(PROVIDER_VARIABLES).not.toContain('REPLICATE_API_TOKEN');
  });
});

describe('rejectionOf: the checks `plan` applies, at run time', () => {
  const req: any = { id: 'tr_1', source: 'en', target: 'ar', items: [{ i: 0, key: 'a', field: 'description', id: 'p1', text: 'Take 2 tablets daily with water' }, { i: 1, key: 'b', field: 'warnings', id: 'p1', text: 'Keep away from children' }] };
  const answer = (arr: unknown) => JSON.stringify(arr);

  it('accepts an answer where at least one item passes', () => {
    expect(rejectionOf(req, answer([{ i: 0, t: 'تناول 2 قرص يوميا مع الماء' }, { i: 1, t: 'Keep away' }]))).toBeNull();
  });
  it('rejects text that is not the JSON list, and a list where nothing passes', () => {
    expect(rejectionOf(req, 'Sure! Here is the translation')).toBe('no_json');
    expect(rejectionOf(req, answer([{ i: 0, t: 'تناول 3 أقراص يوميا مع الماء' }, { i: 1, t: null }]))).toBe('numbers_differ');
    expect(rejectionOf(req, answer([{ i: 0, t: 'Take 2 tablets daily with water' }, { i: 1, t: 'Keep away from children' }]))).toBe('wrong_script');
    expect(rejectionOf(req, answer([{ i: 7, t: 'x' }]))).toBe('no_answer');
  });
  it('an unknown request is never rejected here (plan decides)', () => { expect(rejectionOf(undefined, 'x')).toBeNull(); });
});

describe('translateProviders: budgets', () => {
  it('uses the catalogue numbers times the daily share, and TRANSLATE_LIMITS overrides them', () => {
    const env = { GEMINI_API_KEY: 'k1', GROQ_API_KEY: 'k2', TRANSLATE_DAILY_SHARE: '0.5', TRANSLATE_LIMITS: '{"groq":{"rpm":7,"lanes":1}}' } as unknown as NodeJS.ProcessEnv;
    const by = Object.fromEntries(translateProviders(env).map((p) => [p.name, p.limits]));
    expect(by.gemini.rpd).toBe(750);                       // 1500 * 0.5
    expect(by.gemini.tokens_per_day).toBe(500_000);        // 1,000,000 * 0.5
    expect(by.groq).toMatchObject({ rpm: 7, lanes: 1 });
  });
});
