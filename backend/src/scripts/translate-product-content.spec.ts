import { pendingRequests, PROVIDER_VARIABLES } from './translate-product-content';

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
