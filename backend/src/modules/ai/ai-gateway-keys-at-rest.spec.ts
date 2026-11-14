import { randomBytes } from 'crypto';
import { AiGatewayService, decryptApiKey } from './ai-gateway.service';

// made up per run: no key-shaped literal in the repository
const fake = (tail = '') => `k-${randomBytes(10).toString('hex')}${tail}`;
const PLAIN = fake();
const OTHER = fake();
const OLD = fake();
const PREV = fake('WXYZ');

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
    const { svc, docs } = setup([row('gemini', PLAIN, 1), row('groq', '', 2)]);
    await svc.listProviders();
    expect(docs[0].api_key.startsWith('enc:')).toBe(true);
    expect(docs[0].api_key).not.toContain(PLAIN);
    expect(decryptApiKey(docs[0].api_key)).toBe(PLAIN);
    expect(docs[1].api_key).toBe('');
  });

  it('leaves already wrapped keys untouched and does not rewrite them', async () => {
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const { encryptApiKey } = await import('./ai-gateway.service');
    const wrapped = encryptApiKey(OTHER);
    const { svc, docs, providers } = setup([row('openai', wrapped, 1)]);
    await svc.listProviders();
    expect(docs[0].api_key).toBe(wrapped);
    // providers the gateway knows but the DB lacks are inserted (env sync); no write ever touches a saved key
    expect(providers.updateOne.mock.calls.every(([, u]: any[]) => !u.$set?.api_key)).toBe(true);
  });

  it('keeps plaintext and warns once without the encryption key, then migrates after the retry window', async () => {
    delete process.env.AI_KEYS_ENC_KEY;
    const { svc, docs, providers } = setup([row('gemini', PLAIN, 1)]);
    const warn = jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
    await svc.listProviders();
    await svc.listProviders();
    expect(docs[0].api_key).toBe(PLAIN);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(providers.find).toHaveBeenCalledTimes(4); // 2 list reads + 1 migration scan + 1 env-sync scan, none in the retry window
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 11 * 60_000);
    await svc.listProviders();
    expect(docs[0].api_key.startsWith('enc:')).toBe(true);
  });

  it('a failing write never breaks the registry', async () => {
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const { svc, providers } = setup([row('gemini', PLAIN, 1)]);
    const warn = jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
    providers.updateOne.mockRejectedValueOnce(new Error('not primary'));
    const out = await svc.listProviders();
    expect(out.providers).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not primary'));
  });

  it('flags a key that cannot be decrypted instead of hiding it', async () => {
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const { encryptApiKey } = await import('./ai-gateway.service');
    const wrapped = encryptApiKey(OTHER);
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 9).toString('base64'); // rotated key
    const { svc } = setup([row('openai', wrapped, 1)]);
    const out = await svc.listProviders();
    expect(out.providers[0]).toMatchObject({ has_key: true, key_preview: null, key_unreadable: true });
  });

  it('does not overwrite a key an admin saved while the migration ran', async () => {
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const { svc, docs, providers } = setup([row('gemini', OLD, 1)]);
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
    const { svc, docs } = setup([row('gemini', PREV, 1), row('groq', 'short', 2)]);
    const out = await svc.listProviders();
    const g = out.providers.find((p: any) => p.key === 'gemini')!;
    expect(g.key_preview).toBe('••••WXYZ');
    expect(docs[0].api_key.slice(-4)).not.toBe('WXYZ');
    const q = out.providers.find((p: any) => p.key === 'groq')!;
    expect(q.has_key).toBe(true);
    expect(q.key_preview).toBeNull();
    expect(JSON.stringify(out)).not.toContain(PREV);
  });
});
