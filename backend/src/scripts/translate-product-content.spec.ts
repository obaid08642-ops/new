import { mergeExternal, readExternalDir, pendingRequests, PROVIDER_VARIABLES, rejectionOf, translateProviders } from './translate-product-content';

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

describe('mergeExternal: answer files written outside the server', () => {
  const reqs: any[] = [
    { id: 'tr_1', source: 'en', target: 'ar', items: [{ i: 0, key: 'a', field: 'description', id: 'p1', text: 'Take 2 tablets daily with water' }, { i: 1, key: 'b', field: 'warnings', id: 'p1', text: 'Keep away from children' }] },
    { id: 'tr_2', source: 'ar', target: 'en', items: [{ i: 0, key: 'c', field: 'description', id: 'p2', text: 'يؤخذ 2 قرص يوميا مع الماء' }] },
    { id: 'tr_3', source: 'en', target: 'ur', items: [{ i: 0, key: 'd', field: 'description', id: 'p3', text: 'Take 2 tablets' }] },
  ];
  const plan = () => ({ file: { version: 1 as const, model: 'm', generated_at: 'x', items: [{ id: 'p1', field: 'warnings' as const, target: 'ar' as const, source: 'en' as const, text: 'provider answer', source_sha: 's' }] }, accepted: 1, rejected: {} as any, by_target: {} });
  const line = (o: Record<string, unknown>) => ({ product_id: 'p1', field: 'description', source_lang: 'en', target_lang: 'ar', text: 'تناول 2 قرص يوميا مع الماء', ...o });

  it('accepts a line that passes the checks and adds it to the file', () => {
    const p = plan();
    const r = mergeExternal(p, reqs, [line({})]);
    expect(r.accepted).toBe(1);
    expect(r.by_target).toEqual({ ar: 1 });
    expect(p.file.items.map((i) => `${i.id}|${i.field}|${i.target}`)).toEqual(['p1|description|ar', 'p1|warnings|ar']);
    expect(p.file.items[0].source_sha).toMatch(/^[0-9a-f]{64}$/);
  });
  it('a field a provider already answered keeps the provider answer', () => {
    const p = plan();
    const r = mergeExternal(p, reqs, [line({ field: 'warnings', text: 'ابعد عن الأطفال' })]);
    expect(r.accepted).toBe(0);
    expect(r.rejected.provider_answered).toBe(1);
    expect(p.file.items.find((i) => i.field === 'warnings')?.text).toBe('provider answer');
  });
  it('applies the same checks as a model answer and counts the reasons', () => {
    const p = plan();
    const r = mergeExternal(p, reqs, [
      line({ text: 'تناول 3 أقراص يوميا مع الماء' }),                 // numbers_differ
      line({ text: 'Take 2 tablets daily with water' }),              // wrong_script
      line({ text: '' }),                                             // empty
      line({ text: '```تناول 2 قرص```' }),                            // format
      line({ product_id: 'p9' }),                                     // unknown_gap
      line({ source_lang: 'ar' }),                                    // source_mismatch
      line({ target_lang: 'ur' }),                                    // target_not_allowed
      { product_id: 'p1' },                                           // bad_line
      null,                                                           // bad_line (not JSON)
    ]);
    expect(r.accepted).toBe(0);
    expect(r.rejected).toMatchObject({ numbers_differ: 1, wrong_script: 1, empty: 1, format: 1, unknown_gap: 1, source_mismatch: 1, target_not_allowed: 1, bad_line: 2 });
  });
  it('a repeated line is counted once as a duplicate', () => {
    const p = plan();
    const r = mergeExternal(p, reqs, [line({}), line({})]);
    expect(r.accepted).toBe(1);
    expect(r.rejected.duplicate).toBe(1);
  });
  it('an en target is checked against the Arabic source', () => {
    const p = plan();
    const r = mergeExternal(p, reqs, [{ product_id: 'p2', field: 'description', source_lang: 'ar', target_lang: 'en', text: 'Take three tablets daily with water 3' }]);
    expect(r.rejected.numbers_differ).toBe(1);                         // 3 is not in the source
    const ok = mergeExternal(plan(), reqs, [{ product_id: 'p2', field: 'description', source_lang: 'ar', target_lang: 'en', text: 'Take 2 tablets daily with water' }]);
    expect(ok.accepted).toBe(1);
  });
});

describe('readExternalDir', () => {
  it('reads every .jsonl in name order, keeps a broken line as null, and an absent dir gives nothing', () => {
    const fs = require('fs'); const os = require('os'); const path = require('path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ext-'));
    fs.writeFileSync(path.join(dir, 'b.jsonl'), '{"n":2}\n');
    fs.writeFileSync(path.join(dir, 'a.jsonl'), '{"n":1}\nnot json\n\n');
    fs.writeFileSync(path.join(dir, 'README.md'), 'ignored');
    expect(readExternalDir(dir)).toEqual([{ n: 1 }, null, { n: 2 }]);
    expect(readExternalDir(path.join(dir, 'nope'))).toEqual([]);
  });
});
