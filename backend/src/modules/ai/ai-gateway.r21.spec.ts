import { AiGatewayService, stripPii } from './ai-gateway.service';

const providers = (over: Record<string, any> = {}) => ([
  { key: 'gemini', enabled: true, api_key: 'k-gemini', model: 'gemini-2.0-flash', priority: 1, daily_quota: 0, used_today: 0, usage_date: '', ...(over.gemini || {}) },
  { key: 'groq', enabled: true, api_key: 'k-groq', model: 'llama-3.3-70b-versatile', priority: 2, daily_quota: 0, used_today: 0, usage_date: '', ...(over.groq || {}) },
]);

const mockConn = (settingsDoc: any = { value: 'auto', purpose_overrides: {} }, provs: any[] = providers()) => {
  const updateOne = jest.fn().mockResolvedValue({});
  const conn: any = {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'featureflags') {
        return { findOne: jest.fn().mockResolvedValue(settingsDoc), updateOne };
      }
      if (name === 'ai_providers') {
        return {
          countDocuments: jest.fn().mockResolvedValue(provs.length),
          find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(provs) }) }),
          findOne: jest.fn().mockImplementation((q: any) => Promise.resolve(provs.find((p) => p.key === q.key) || null)),
          updateOne: jest.fn().mockResolvedValue({}),
        };
      }
      return { insertOne: jest.fn().mockResolvedValue({}), updateOne: jest.fn().mockResolvedValue({}) };
    }),
  };
  return conn;
};

const svc = (conn: any) => {
  const s = new AiGatewayService(conn);
  s.setGuardTuning({ cooldownMs: 60_000, cacheTtlMs: 60_000, callTimeoutMs: 5_000 });
  return s;
};

describe('13.R21 single gateway (mocked transports — no live provider calls)', () => {
  it('fails over to the next provider on 429 and cools the failed one down', async () => {
    const s = svc(mockConn());
    s.setTransportForTests(async (p) => {
      if (p.key === 'gemini') throw Object.assign(new Error('gemini_http_429: rate limit exceeded'), { status: 429 });
      return `ok-from-${p.key}`;
    });
    const r: any = await s.generate({ prompt: 'hello', feature: 'triage' });
    expect(r.provider).toBe('groq');
    expect(r.fell_back).toBe(true);
    // gemini is now in cooldown → next request skips it without calling it
    const r2: any = await s.generate({ prompt: 'different prompt here', feature: 'triage' });
    expect(r2.provider).toBe('groq');
    expect(r2.fell_back).toBe(true);
  });

  it('switches provider when the per-provider req/day quota is exhausted', async () => {
    const s = svc(mockConn({}, providers({ gemini: { req_per_day: 1 } })));
    const calls: string[] = [];
    s.setTransportForTests(async (p) => { calls.push(p.key); return `ok-${p.key}`; });
    const r1: any = await s.generate({ prompt: 'q1', feature: 'triage' });
    const r2: any = await s.generate({ prompt: 'q2', feature: 'triage' });
    expect(r1.provider).toBe('gemini');
    expect(r2.provider).toBe('groq');
    expect(calls).toEqual(['gemini', 'groq']);
  });

  it('respects the per-feature pin (override goes first)', async () => {
    const s = svc(mockConn({ value: 'auto', purpose_overrides: { triage: 'groq' } }));
    const order: string[] = [];
    s.setTransportForTests(async (p) => { order.push(p.key); return `ok-${p.key}`; });
    const r: any = await s.generate({ prompt: 'pinned?', feature: 'triage' });
    expect(order[0]).toBe('groq');
    expect(r.provider).toBe('groq');
    expect(r.fell_back).toBe(false);
  });

  it('strips PII before text leaves the process (transport never sees it)', async () => {
    const s = svc(mockConn());
    let seen = '';
    s.setTransportForTests(async (_p, o) => { seen = String((o as any).prompt); return 'ok'; });
    await s.generate({ prompt: 'Patient Ahmed phone 0551234567 email a@x.com NID 1234567890 help', feature: 'triage' });
    expect(seen).not.toContain('0551234567');
    expect(seen).not.toContain('a@x.com');
    expect(seen).not.toContain('1234567890');
    expect(seen).toMatch(/\[redacted-(phone|email|id)\]/);
    // pure helper sanity
    expect(stripPii('Name: Layla, call 0509876543')).toContain('Name: [redacted]');
  });

  it('caches identical requests (second call is a cache hit, transport once)', async () => {
    const s = svc(mockConn());
    let n = 0;
    s.setTransportForTests(async () => { n += 1; return 'same-answer'; });
    const a: any = await s.generate({ prompt: 'repeat me', feature: 'triage' });
    const b: any = await s.generate({ prompt: 'repeat me', feature: 'triage' });
    expect(a.text).toBe('same-answer');
    expect(b.cached).toBe(true);
    expect(b.text).toBe('same-answer');
    expect(n).toBe(1);
  });
});
