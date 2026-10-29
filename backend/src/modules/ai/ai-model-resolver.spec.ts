import { parseModelList, pickModel, rankedModels, resolveModel } from './ai-model-resolver';

describe('ai-model-resolver', () => {
  it('reads Gemini (models/<id>, only generateContent) and OpenAI-style lists', () => {
    expect(parseModelList('gemini', { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }] })).toEqual(['gemini-2.5-flash']);
    expect(parseModelList('groq', { data: [{ id: 'a' }, { id: 'b' }, {}] })).toEqual(['a', 'b']);
    expect(parseModelList('groq', null)).toEqual([]);
  });

  it('picks the first preferred id that the provider lists, else null', () => {
    expect(pickModel('groq', ['qwen/qwen3-32b', 'llama-3.1-8b-instant'])).toBe('llama-3.1-8b-instant');
    expect(pickModel('gemini', ['gemini-flash-latest', 'gemini-2.5-flash-lite'])).toBe('gemini-2.5-flash-lite');
    expect(pickModel('groq', ['something-else'])).toBeNull();
    expect(pickModel('groq', ['something-else'], 'something-else')).toBe('something-else');   // the configured id is kept when it is listed
  });

  it('OpenRouter: only PREFERRED :free ids qualify; an arbitrary free model (79 s per answer) or a paid one never does', () => {
    expect(pickModel('openrouter', ['recursive/flint-v1.0:free', 'meta-llama/llama-3.3-70b-instruct'])).toBeNull();
    expect(pickModel('openrouter', ['recursive/flint-v1.0:free'], 'recursive/flint-v1.0:free')).toBeNull();
    expect(pickModel('openrouter', ['recursive/flint-v1.0:free', 'google/gemma-4-26b-a4b-it:free', 'google/gemma-4-31b-it:free'])).toBe('google/gemma-4-31b-it:free');
  });

  it('groq prefers non-reasoning chat models over gpt-oss', () => {
    expect(pickModel('groq', ['openai/gpt-oss-20b', 'meta-llama/llama-4-scout-17b-16e-instruct'])).toBe('meta-llama/llama-4-scout-17b-16e-instruct');
    expect(rankedModels('groq', ['openai/gpt-oss-20b', 'llama-3.1-8b-instant'], new Set(['llama-3.1-8b-instant']))).toEqual(['openai/gpt-oss-20b']);
  });

  it('asks Gemini and the others at their model list URLs with the key in the header, and throws fixed codes only', async () => {
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    const f = (async (url: string, init: { headers: Record<string, string> }) => { seen.push({ url, headers: init.headers }); return { ok: true, status: 200, json: async () => ({ data: [{ id: 'llama-3.1-8b-instant' }] }) }; }) as unknown as typeof fetch;
    await expect(resolveModel('groq', 'https://api.groq.com/openai/v1', 'k', 'old', f)).resolves.toBe('llama-3.1-8b-instant');
    expect(seen[0]).toEqual({ url: 'https://api.groq.com/openai/v1/models', headers: { authorization: 'Bearer k' } });
    const gem = (async (url: string, init: { headers: Record<string, string> }) => { seen.push({ url, headers: init.headers }); return { ok: false, status: 403, body: { cancel: async () => undefined } }; }) as unknown as typeof fetch;
    await expect(resolveModel('gemini', undefined, 'k', 'old', gem)).rejects.toThrow('gemini_models_http_403');
    expect(seen[1].url).toContain('generativelanguage.googleapis.com/v1beta/models');
    expect(seen[1].headers).toEqual({ 'x-goog-api-key': 'k' });
  });
});
