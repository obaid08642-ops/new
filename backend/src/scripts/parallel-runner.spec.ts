import { runParallel, ParallelProvider } from './parallel-runner';

function harness() {
  let t = 0;
  const lines: string[] = [];
  const logs: string[] = [];
  const done = new Set<string>();
  const io = {
    done, write: (l: string) => lines.push(l), log: (l: string) => logs.push(l), now: () => t,
    sleep: async (ms: number) => { t += ms; await new Promise((r) => setImmediate(r)); },
  };
  const advance = (ms: number) => { t += ms; };
  return { io, lines, logs, done, advance, time: () => t };
}
const reqs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, prompt: `p${i}` }));
const fast = { rpm: 6000, lanes: 2 };
const ok = (name: string, h: ReturnType<typeof harness>, latency = 100): ParallelProvider => ({ name, limits: fast, call: async (p) => { h.advance(latency); return `${name}:${p}`; } });

describe('runParallel (translation throughput)', () => {
  it('uses every provider at once: the work is shared, every request is answered once', async () => {
    const h = harness();
    const res = await runParallel(reqs(40), [ok('a', h), ok('b', h), ok('c', h)], h.io);
    expect(res).toMatchObject({ sent: 40, failed: 0, skipped: 0 });
    expect(new Set(h.lines.map((l) => JSON.parse(l).id)).size).toBe(40);
    for (const n of ['a', 'b', 'c']) expect(res.providers[n].ok).toBeGreaterThan(5);
    expect(res.providers.a.avg_latency_ms).toBeGreaterThanOrEqual(100);   // the virtual clock is shared by all lanes
  });

  it('a provider that answers 429 is parked on its own: the others carry on, and its request is answered elsewhere', async () => {
    const h = harness();
    const limited: ParallelProvider = { name: 'lim', limits: fast, call: async () => { throw new Error('lim_http_429'); } };
    const res = await runParallel(reqs(30), [limited, ok('b', h)], h.io);
    expect(res).toMatchObject({ sent: 30, failed: 0 });
    expect(res.providers.lim.limited).toBeGreaterThanOrEqual(1);
    expect(res.providers.lim.parked_ms).toBeGreaterThan(0);
    expect(res.providers.b.ok).toBe(30);
  });

  it('a rejected key retires that provider only', async () => {
    const h = harness();
    const bad: ParallelProvider = { name: 'bad', limits: fast, call: async () => { throw new Error('ai_provider_auth_failed'); } };
    const res = await runParallel(reqs(10), [bad, ok('b', h)], h.io);
    expect(res.sent).toBe(10);
    expect(res.providers.bad.retired).toBe('key rejected');
  });

  it('stops sending to a provider at its daily budget (requests and tokens)', async () => {
    const h = harness();
    const r1 = await runParallel(reqs(20), [{ ...ok('a', h), limits: { ...fast, rpd: 3 } }, ok('b', h)], h.io);
    expect(r1.providers.a.sent).toBeLessThanOrEqual(3);
    expect(r1.sent).toBe(20);
    const h2 = harness();
    const r2 = await runParallel(reqs(20), [{ ...ok('a', h2), limits: { ...fast, tokens_per_day: 8 } }, ok('b', h2)], h2.io, { tokensOf: () => 2 });
    expect(r2.providers.a.sent).toBeLessThanOrEqual(2);          // 2 tokens in + 2 out per request, 8 allowed
    expect(r2.sent).toBe(20);
  });

  it('a request every provider fails is given up after maxAttempts and stays unanswered (resumable)', async () => {
    const h = harness();
    const broken = (n: string): ParallelProvider => ({ name: n, limits: fast, call: async () => { throw new Error(`${n}_http_500`); } });
    const res = await runParallel(reqs(3), [broken('a'), broken('b')], h.io, { maxAttempts: 3 });
    expect(res.sent).toBe(0);
    expect(res.failed).toBe(3);
    expect(h.lines).toEqual([]);
    expect(res.providers.a.errors + res.providers.b.errors).toBeGreaterThanOrEqual(9);
  });

  it('skips answered requests and prints a status line every N answers', async () => {
    const h = harness();
    h.done.add('r0'); h.done.add('r1');
    const res = await runParallel(reqs(30), [ok('a', h), ok('b', h)], h.io, { statusEvery: 10 });
    expect(res.skipped).toBe(2);
    expect(res.sent).toBe(28);
    const status = h.logs.filter((l) => l.startsWith('status:'));
    expect(status.length).toBeGreaterThanOrEqual(3);              // 10, 20 and the final line
    expect(status[0]).toMatch(/answered \d+\/28 .*a=\d+ b=\d+/);
  });

  it('keeps each provider to its own spacing (rpm): no more than one start per interval per provider', async () => {
    const h = harness();
    const starts: number[] = [];
    const slow: ParallelProvider = { name: 's', limits: { rpm: 60, lanes: 3 }, call: async () => { starts.push(h.time()); h.advance(10); return 'x'; } };
    await runParallel(reqs(6), [slow], h.io);
    for (let i = 1; i < starts.length; i += 1) expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(900);   // 1 per second
  });
});
