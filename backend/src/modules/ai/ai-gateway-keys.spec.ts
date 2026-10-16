import { randomBytes } from 'crypto';
import { AiGatewayService } from './ai-gateway.service';
import { FieldEncryptionService } from '../../common/pdpl-compliance.module';

/**
 * 16.1 (13.R21): AI provider keys are encrypted at rest and masked on read.
 * Raw DB values are ciphertext; admin reads carry presence + tail only.
 */
describe('AiGatewayService provider key sealing (16.1)', () => {
  const OLD_KEY = process.env.FIELD_ENCRYPTION_KEY;
  const TEST_KEY = randomBytes(32).toString('hex');
  const PLAIN = 'sk-test-gateway-key-123456';

  // In-memory ai_providers rows keyed by provider key.
  const store = new Map<string, any>();
  const providersColl = () => ({
    countDocuments: jest.fn().mockImplementation(() => Promise.resolve(store.size)),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockImplementation(() => Promise.resolve([...store.values()])) }) }),
    findOne: jest.fn().mockImplementation((q: any) => Promise.resolve(store.get(q.key) || null)),
    updateOne: jest.fn().mockImplementation((q: any, u: any, opts?: any) => {
      const prev = store.get(q.key) || { key: q.key };
      store.set(q.key, { ...prev, ...(u.$set || {}) });
      return Promise.resolve({ modifiedCount: 1 });
    }),
  });
  const conn: any = {
    collection: jest.fn().mockImplementation((n: string) =>
      n === 'ai_providers' ? providersColl() : {
        findOne: jest.fn().mockResolvedValue({ value: 'auto' }),
        updateOne: jest.fn().mockResolvedValue({}),
      }),
  };

  beforeEach(() => {
    store.clear();
    store.set('openai', { key: 'openai', enabled: true, api_key: '', model: 'gpt-4o-mini', priority: 3, daily_quota: 500, used_today: 0 });
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
  });
  afterAll(() => {
    if (OLD_KEY === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
    else process.env.FIELD_ENCRYPTION_KEY = OLD_KEY;
  });

  const svc = () => new AiGatewayService(conn, new FieldEncryptionService());

  it('stores ciphertext in the DB and never echoes the key', async () => {
    const s = svc();
    const out: any = await s.updateProvider('openai', { api_key: PLAIN } as any);
    const raw = String(store.get('openai').api_key);
    expect(raw).not.toBe(PLAIN);
    expect(raw.startsWith('enc.v1:')).toBe(true);
    expect(out.api_key).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain(PLAIN);
    expect(out.has_key).toBe(true);
    expect(out.key_tail).toBe(`…${PLAIN.slice(-4)}`);
  });

  it('admin reads carry presence + tail only, and the key still works', async () => {
    const s = svc();
    await s.updateProvider('openai', { api_key: PLAIN } as any);
    const page: any = await s.listProviders();
    const row = page.providers.find((p: any) => p.key === 'openai');
    expect(row.has_key).toBe(true);
    expect(row.key_tail).toBe(`…${PLAIN.slice(-4)}`);
    expect('api_key' in row).toBe(false);
    expect(JSON.stringify(page)).not.toContain(PLAIN);
    // The stored row decrypts through the service (usage path intact).
    const again: any = await s.listProviders();
    expect(again.providers.find((p: any) => p.key === 'openai').has_key).toBe(true);
  });

  it('legacy plaintext rows keep working (decrypt passes them through)', async () => {
    store.get('openai').api_key = PLAIN;
    const s = svc();
    const page: any = await s.listProviders();
    expect(page.providers.find((p: any) => p.key === 'openai').has_key).toBe(true);
  });

  it('empty keys read as absent (no tail, no flag)', async () => {
    const s = svc();
    const page: any = await s.listProviders();
    const row = page.providers.find((p: any) => p.key === 'openai');
    expect(row.has_key).toBe(false);
    expect(row.key_tail).toBeNull();
  });
});
