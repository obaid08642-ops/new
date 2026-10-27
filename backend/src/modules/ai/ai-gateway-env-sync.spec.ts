import { randomBytes } from 'crypto';
import { AiGatewayService, decryptApiKey, encryptApiKey } from './ai-gateway.service';
import { PROVIDER_ENV_KEY } from './ai-provider-catalog';

// made up per run: no key-shaped literal in the repository
const fake = () => `k-${randomBytes(10).toString('hex')}`;

/** Owner request 2026-10-26: a key added to the environment later must reach the gateway; an admin-saved key is never replaced. */
describe('AI provider env → DB sync', () => {
  const OLD_ENV = { ...process.env };
  const row = (key: string, api_key: string, priority: number, extra: Record<string, unknown> = {}) => ({
    key, enabled: true, api_key, model: 'm', priority, daily_quota: 0, used_today: 0, usage_date: '', ...extra,
  });

  function setup(rows: Array<Record<string, any>>) {
    const docs = rows.map((r) => ({ ...r }));
    const matches = (d: any, f: any): boolean => Object.entries(f).every(([k, v]) => {
      if (k === '$or') return (v as any[]).some((c) => matches(d, c));
      if (v && typeof v === 'object' && '$exists' in (v as object)) return ((v as any).$exists as boolean) === (d[k] !== undefined);
      return d[k] === v;
    });
    const providers = {
      countDocuments: jest.fn(async () => docs.length),
      find: jest.fn(() => ({ sort: () => ({ toArray: async () => docs }), toArray: async () => docs })),
      updateOne: jest.fn(async (f: any, u: any, o?: any) => {
        const d = docs.find((x) => matches(x, f));
        if (!d) {
          if (o?.upsert) { docs.push({ key: f.key, ...(u.$setOnInsert || {}), ...(u.$set || {}) }); return { modifiedCount: 0, upsertedCount: 1 }; }
          return { modifiedCount: 0 };
        }
        if (u.$set) Object.assign(d, u.$set);
        return { modifiedCount: u.$set ? 1 : 0 };
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

  beforeEach(() => {
    process.env = { ...OLD_ENV, AI_KEYS_ENC_KEY: Buffer.alloc(32, 7).toString('base64') };
    for (const v of Object.values(PROVIDER_ENV_KEY)) delete process.env[v];
  });
  afterEach(() => { process.env = { ...OLD_ENV }; jest.restoreAllMocks(); });

  it('stores an environment key (encrypted) for a provider whose DB key is empty', async () => {
    const k = fake();
    process.env.GROQ_API_KEY = k;
    const { svc, docs } = setup([row('gemini', '', 1), row('groq', '', 2)]);
    await svc.listProviders();
    const groq = docs.find((d) => d.key === 'groq')!;
    expect(groq.api_key.startsWith('enc:')).toBe(true);
    expect(groq.api_key).not.toContain(k);
    expect(decryptApiKey(groq.api_key)).toBe(k);
  });

  it('never overwrites a key an admin saved', async () => {
    const saved = fake();
    const wrapped = encryptApiKey(saved);
    process.env.GEMINI_API_KEY = fake();
    const { svc, docs } = setup([row('gemini', wrapped, 1)]);
    await svc.listProviders();
    expect(docs.find((d) => d.key === 'gemini')!.api_key).toBe(wrapped);
    expect(decryptApiKey(docs.find((d) => d.key === 'gemini')!.api_key)).toBe(saved);
  });

  it('inserts a provider the gateway knows but the DB lacks (OpenCode) and fills it from OPENCODE_API_KEY', async () => {
    const k = fake();
    process.env.OPENCODE_API_KEY = k;
    const { svc, docs } = setup([row('gemini', '', 1)]);
    await svc.listProviders();
    const oc = docs.find((d) => d.key === 'opencode')!;
    expect(oc).toBeDefined();
    expect(oc.base_url).toBe('https://opencode.ai/inference/openai/v1');
    expect(decryptApiKey(oc.api_key)).toBe(k);
  });

  it('runs once per process, and logs provider names only', async () => {
    const k = fake();
    process.env.DEEPSEEK_API_KEY = k;
    const { svc, providers } = setup([row('deepseek', '', 1)]);
    const log = jest.spyOn((svc as any).logger, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
    await svc.listProviders();
    const writes = providers.updateOne.mock.calls.length;
    await svc.listProviders();
    expect(providers.updateOne.mock.calls.length).toBe(writes);
    const logged = [...log.mock.calls, ...warn.mock.calls].map((c) => String(c[0])).join('\n');
    expect(logged).toContain('deepseek');
    expect(logged).not.toContain(k);
  });

  it('a failing sync never breaks the registry, and is retried later', async () => {
    process.env.GROQ_API_KEY = fake();
    const { svc, providers } = setup([row('groq', '', 1)]);
    jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
    providers.updateOne.mockRejectedValueOnce(new Error('not primary'));
    const out = await svc.listProviders();
    expect(out.providers.length).toBeGreaterThan(0);
    expect((svc as any).envSyncedAt).toBeGreaterThan(Date.now());
    expect((svc as any).envSyncedAt).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});
