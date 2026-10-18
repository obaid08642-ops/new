import { AiGatewayService, decryptApiKey } from './ai-gateway.service';

// 16.1: provider keys are ciphertext at rest. The assertions read the raw value
// stored in the collection, not the service's decrypted view.
describe('16.1 AI provider keys at rest', () => {
  const OLD_ENV = { ...process.env };

  function setup(rows: Array<Record<string, any>>) {
    const docs = rows.map((r) => ({ ...r }));
    const providers = {
      countDocuments: jest.fn(async () => docs.length),
      find: jest.fn(() => ({ sort: () => ({ toArray: async () => docs }), toArray: async () => docs })),
      updateOne: jest.fn(async (f: any, u: any) => {
        const d = docs.find((x) => Object.entries(f).every(([k, v]) => x[k] === v));
        if (!d) return { modifiedCount: 0 };
        Object.assign(d, u.$set);
        return { modifiedCount: 1 };
      }),
    };
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'ai_providers') return providers;
        if (name === 'featureflags') return { findOne: jest.fn(async () => ({ key: 'ai_mode', value: 'auto' })), updateOne: jest.fn() };
        return { findOne: jest.fn(async () => null), aggregate: jest.fn(() => ({ toArray: async () => [] })) };
      }),
    };
    return { svc: new AiGatewayService(conn, undefined as any), docs, providers };
  }

  const row = (key: string, api_key: string, priority: number) => ({
    key, enabled: true, api_key, model: 'm', priority, daily_quota: 0, used_today: 0, usage_date: '',
  });

  afterEach(() => { process.env = { ...OLD_ENV }; jest.restoreAllMocks(); });

  it('wraps legacy plaintext keys in the stored document', async () => {
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const { svc, docs } = setup([row('gemini', 'AIzaSyLegacyKey1234', 1), row('groq', '', 2)]);
    await svc.listProviders();
    expect(docs[0].api_key.startsWith('enc:')).toBe(true);
    expect(docs[0].api_key).not.toContain('AIzaSyLegacyKey1234');
    expect(decryptApiKey(docs[0].api_key)).toBe('AIzaSyLegacyKey1234');
    expect(docs[1].api_key).toBe('');
  });

  it('leaves already wrapped keys untouched and does not rewrite them', async () => {
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const { encryptApiKey } = await import('./ai-gateway.service');
    const wrapped = encryptApiKey('sk-live-abcdefgh');
    const { svc, docs, providers } = setup([row('openai', wrapped, 1)]);
    await svc.listProviders();
    expect(docs[0].api_key).toBe(wrapped);
    expect(providers.updateOne).not.toHaveBeenCalled();
  });

  it('keeps plaintext and warns when the encryption key is missing, then migrates once it exists', async () => {
    delete process.env.AI_KEYS_ENC_KEY;
    const { svc, docs } = setup([row('gemini', 'AIzaSyLegacyKey1234', 1)]);
    await svc.listProviders();
    expect(docs[0].api_key).toBe('AIzaSyLegacyKey1234');
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    await svc.listProviders();
    expect(docs[0].api_key.startsWith('enc:')).toBe(true);
  });

  it('does not overwrite a key an admin saved while the migration ran', async () => {
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const { svc, docs, providers } = setup([row('gemini', 'AIzaSyOld1234567', 1)]);
    const realUpdate = providers.updateOne.getMockImplementation()!;
    providers.updateOne.mockImplementationOnce(async (f: any, u: any) => {
      docs[0].api_key = 'enc:saved-by-admin';
      return realUpdate(f, u);
    });
    await svc.listProviders();
    expect(docs[0].api_key).toBe('enc:saved-by-admin');
  });

  it('previews the end of the real key, not of the ciphertext, and never the whole key', async () => {
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const { svc, docs } = setup([row('gemini', 'AIzaSyLegacyKeyWXYZ', 1), row('groq', 'short', 2)]);
    const out = await svc.listProviders();
    const g = out.providers.find((p: any) => p.key === 'gemini')!;
    expect(g.key_preview).toBe('••••WXYZ');
    expect(docs[0].api_key.slice(-4)).not.toBe('WXYZ');
    const q = out.providers.find((p: any) => p.key === 'groq')!;
    expect(q.has_key).toBe(true);
    expect(q.key_preview).toBeNull();
    expect(JSON.stringify(out)).not.toContain('AIzaSyLegacyKey');
  });
});
