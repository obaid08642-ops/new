// Issue 410: the axios client (utils/api.ts -> src/services/HttpClient.ts), the fetch client (src/utils/api.ts) and
// src/constants resolve the API base through one rule, so sign-in and the rest of the app reach the same host.
function bases(env: Record<string, string | undefined>): string[] {
  const saved = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  let out: string[] = [];
  jest.isolateModules(() => {
    out = [
      require('../../services/HttpClient').RESOLVED_BASE_URL,
      require('../../utils/api').BASE_URL,
      require('../../constants').API_BASE_URL,
    ];
  });
  process.env = saved;
  return out;
}

describe('one API base URL for every client', () => {
  it('only the older EXPO_PUBLIC_API_URL set: every client uses it with /api/v1', () => {
    expect(bases({ EXPO_PUBLIC_API_URL: 'https://api.example.test/', EXPO_PUBLIC_API_BASE_URL: undefined })).toEqual(Array(3).fill('https://api.example.test/api/v1'));
  });

  it('only EXPO_PUBLIC_API_BASE_URL set: every client uses it', () => {
    expect(bases({ EXPO_PUBLIC_API_URL: undefined, EXPO_PUBLIC_API_BASE_URL: 'https://base.example.test/api/v1' })).toEqual(Array(3).fill('https://base.example.test/api/v1'));
  });

  it('neither set: the same environment default everywhere', () => {
    const [a, b, c] = bases({ EXPO_PUBLIC_API_URL: undefined, EXPO_PUBLIC_API_BASE_URL: undefined });
    expect(b).toBe(a);
    expect(c).toBe(a);
  });
});
