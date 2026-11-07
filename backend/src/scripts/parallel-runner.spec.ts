import { runParallel, ParallelProvider, errorClass, nextResetMs, RunSnapshot } from './parallel-runner';

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

describe('one bad provider cannot stall the rest (offline reproduction with stub providers)', () => {
  const stub = (name: string, h: ReturnType<typeof harness>, behaviour: (p: string) => string | Error, latency = 50): ParallelProvider => ({
    name, limits: { rpm: 6000, lanes: 2 }, call: async (p) => { await h.io.sleep(latency); const r = behaviour(p); if (r instanceof Error) throw r; return r; },
  });
  const good = (p: string) => `ok:${p}`;

  it('429 + 401 + answers that fail the checks + a timeout + one good provider: every request is answered by the good one, in bounded time', async () => {
    const h = harness();
    const providers = [
      stub('limited', h, () => new Error('limited_http_429')),
      stub('unauth', h, () => new Error('ai_provider_auth_failed')),
      stub('junk', h, () => 'not a translation'),
      stub('slow', h, () => Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })),
      stub('good', h, good),
    ];
    const res = await runParallel(reqs(60), providers, h.io, { validate: (_id, t) => (t.startsWith('ok:') ? null : 'no_json') });
    expect(res.sent).toBe(60);
    expect(res.failed).toBe(0);
    expect(res.providers.good.ok).toBe(60);
    expect(res.providers.unauth.retired).toBe('key rejected');
    expect(res.providers.junk.rejected).toBeGreaterThan(0);
    expect(res.providers.junk.retired).toMatch(/failing the checks/);
    expect(res.providers.limited.limited).toBeGreaterThan(0);
    expect(res.providers.slow.error_classes.timeout).toBeGreaterThan(0);
    expect(h.time()).toBeLessThan(10 * 60_000);                // virtual minutes: the bad ones cost the good one nothing
    expect(h.lines).toHaveLength(60);
    expect(h.lines.every((l) => JSON.parse(l).text.startsWith('ok:'))).toBe(true);   // no rejected answer was written
  });

  it('answers that fail the checks are asked of another provider and are not retried forever', async () => {
    const h = harness();
    const junk = stub('junk', h, () => 'x');
    const res = await runParallel(reqs(5), [junk], h.io, { maxAttempts: 3, validate: () => 'numbers_differ' });
    expect(res.sent).toBe(0);
    expect(res.failed).toBe(5);                                  // given up, unanswered, not looping
    expect(h.lines).toEqual([]);
    expect(res.providers.junk.error_classes.rejected_numbers_differ).toBeGreaterThanOrEqual(5);
  });

  it('a provider refused with 400/404 again and again is retired, not parked forever', async () => {
    const h = harness();
    const res = await runParallel(reqs(60), [stub('wrongmodel', h, () => new Error('wrongmodel_http_404')), stub('good', h, good, 8000)], h.io);
    expect(res.sent).toBe(60);
    expect(res.providers.wrongmodel.retired).toBe('refused by the provider (http_404)');
    expect(res.providers.wrongmodel.sent).toBeLessThanOrEqual(12);
  });

  it('a 429 parks the provider and never retires it; a few 404s at the start do not retire it either', async () => {
    const h = harness();
    let n = 0;
    const flaky = stub('flaky', h, () => (++n <= 3 ? new Error('flaky_http_404') : 'ok:flaky'));
    const limited = stub('limited', h, () => new Error('limited_http_429'));
    const res = await runParallel(reqs(30), [flaky, limited, stub('good', h, good, 8000)], h.io);
    expect(res.providers.limited.limited).toBeGreaterThan(0);
    expect(res.providers.limited.retired).toBeNull();
    expect(res.providers.flaky.retired).toBeNull();
    expect(res.providers.flaky.ok).toBeGreaterThan(0);
  });

  it('a 503 (overloaded) backs the provider off like a limit and never retires it', async () => {
    const h = harness();
    const over = stub('over', h, () => new Error('over_http_503'));
    const res = await runParallel(reqs(20), [over, stub('good', h, good, 8000)], h.io);
    expect(res.providers.over.limited).toBeGreaterThan(0);
    expect(res.providers.over.parked_ms).toBeGreaterThanOrEqual(30_000);
    expect(res.providers.over.retired).toBeNull();
  });

  it('no balance (402) and an account out of quota retire the provider at once; its requests go to the others', async () => {
    const h = harness();
    const res = await runParallel(reqs(20), [stub('broke', h, () => new Error('broke_http_402')), stub('empty', h, () => new Error('empty_quota_exhausted')), stub('good', h, good, 8000)], h.io);
    expect(res.sent).toBe(20);
    expect(res.providers.broke.retired).toBe('no balance or quota left');
    expect(res.providers.broke.sent).toBeLessThanOrEqual(3);     // at most the requests already in flight on its lanes
    expect(res.providers.empty.retired).toBe('no balance or quota left');
    expect(res.providers.empty.error_classes.quota).toBeLessThanOrEqual(3);
  });

  it('an empty answer does not park or retire the provider early; the request goes on; a provider that is always empty is retired after a long streak', async () => {
    const h = harness();
    let n = 0;
    const flaky = stub('flaky', h, () => (++n % 3 === 0 ? new Error('flaky_empty_response') : 'ok:flaky'));
    const empty = stub('empty', h, () => new Error('empty_empty_response'));
    const res = await runParallel(reqs(60), [flaky, empty, stub('good', h, good, 8000)], h.io);
    expect(res.sent).toBe(60);
    expect(res.providers.flaky.retired).toBeNull();
    expect(res.providers.flaky.parked_ms).toBe(0);
    expect(res.providers.empty.retired).toBe('answers keep coming back empty');
  });

  it('a free-only provider with no preferred model listed is retired with that reason', async () => {
    const h = harness();
    const res = await runParallel(reqs(10), [stub('openrouter', h, () => new Error('openrouter_no_preferred_free_model')), stub('good', h, good, 8000)], h.io);
    expect(res.sent).toBe(10);
    expect(res.providers.openrouter.retired).toBe('no preferred free model');
  });

  it('every provider failing ends the run (nothing hangs) with the requests left unanswered', async () => {
    const h = harness();
    const res = await runParallel(reqs(10), [stub('a', h, () => new Error('a_http_404')), stub('b', h, () => new Error('ai_provider_auth_failed'))], h.io);
    expect(res.sent).toBe(0);
    expect(res.failed).toBe(10);
    expect(res.providers.a.retired).toBeTruthy();
    expect(res.providers.b.retired).toBe('key rejected');
  });

  it('writes snapshots with counts only: per provider sent/ok/limited/errors/rejected/retired/parked_until, and overall answered/remaining/last_answer_at', async () => {
    const h = harness();
    const snaps: RunSnapshot[] = [];
    const secret = ['sk', 'live', 'SECRET', 'KEY', '123'].join('-'); // a FAKE key, built at runtime so the secret scanner does not flag the fixture
    const leaky = stub('leaky', h, () => new Error(`leaky_http_500 Authorization: Bearer ${secret}`));
    await runParallel(reqs(40), [leaky, stub('good', h, good, 2000)], h.io, { snapshotEveryMs: 1000, onSnapshot: (x) => snaps.push(x) });
    expect(snaps.length).toBeGreaterThan(2);
    const last = snaps[snaps.length - 1];
    expect(last).toMatchObject({ answered: 40, remaining: 0, failed: 0 });
    expect(last.last_answer_at).toMatch(/^\d{4}-/);
    expect(Object.keys(last.providers.good).sort()).toEqual(['avg_latency_ms', 'error_classes', 'errors', 'limited', 'ok', 'parked_ms', 'parked_until', 'rejected', 'retired', 'retired_until', 'revived', 'sent']);
    expect(snaps.some((x) => x.providers.leaky.parked_until !== null)).toBe(true);
    const text = JSON.stringify(snaps) + h.logs.join('\n');
    expect(text).not.toContain(secret);                           // the error text never leaves the class
    expect(text).not.toContain('Bearer');
    expect(last.providers.leaky.error_classes).toEqual(expect.objectContaining({ http_500: expect.any(Number) }));
  });
});

describe('errorClass', () => {
  it.each([
    ['x_http_429', 'http_429'], ['gemini_http_503', 'http_503'], ['ai_provider_auth_failed', 'auth'], ['groq_empty_response', 'empty'],
    ['The operation was aborted due to timeout', 'timeout'], ['fetch failed', 'network'], ['something with sk-123 in it', 'other'],
  ])('%s -> %s', (msg, cls) => { expect(errorClass(new Error(msg))).toBe(cls); });
});



describe('a retirement heals at the provider\'s next daily reset (2026-11-02: cerebras, deepseek, openai and groq were retired for the whole run)', () => {
  const HOUR = 3_600_000;
  const at = (iso: string) => Date.parse(iso);

  it('nextResetMs: the next midnight of the provider\'s own zone, also across a day of 23 or 25 hours', () => {
    expect(new Date(nextResetMs(at('2026-11-02T13:00:00Z'), 'UTC')).toISOString()).toBe('2026-11-03T00:00:00.000Z');
    expect(new Date(nextResetMs(at('2026-11-02T23:59:30Z'), 'UTC')).toISOString()).toBe('2026-11-03T00:00:00.000Z');
    expect(new Date(nextResetMs(at('2026-11-02T13:00:00Z'), 'America/Los_Angeles')).toISOString()).toBe('2026-11-03T08:00:00.000Z');   // PST (UTC-8) after the clocks went back on 11-01
    expect(new Date(nextResetMs(at('2026-11-01T05:00:00Z'), 'America/Los_Angeles')).toISOString()).toBe('2026-11-01T07:00:00.000Z');   // 22:00 on Oct 31 (PDT): midnight is 07:00Z
    expect(new Date(nextResetMs(at('2026-11-01T08:00:00Z'), 'America/Los_Angeles')).toISOString()).toBe('2026-11-02T08:00:00.000Z');   // 01:00 on Nov 1 (PDT): the 25-hour day of the change ends at 08:00Z
    expect(new Date(nextResetMs(at('2026-11-02T13:00:00Z'), 'Not/AZone')).toISOString()).toBe('2026-11-03T00:00:00.000Z');              // an unknown zone is UTC
  });

  it('a provider whose budget is used is brought back on the new day by the providers still working, with its budget cleared, and answers again', async () => {
    const h = harness();
    h.advance(at('2026-11-02T22:00:00Z'));                                     // two hours before the reset
    const slowGood: ParallelProvider = { name: 'good', limits: { rpm: 2, lanes: 1 }, call: async (p) => { h.advance(30_000); return `good:${p}`; } };   // about 1 request a minute
    const capped: ParallelProvider = { name: 'capped', limits: { rpm: 6000, lanes: 1, rpd: 3 }, call: async (p) => { h.advance(100); return `capped:${p}`; } };
    const res = await runParallel(reqs(400), [slowGood, capped], h.io);
    expect(res.providers.capped.revived).toBeGreaterThanOrEqual(1);
    expect(res.providers.capped.ok).toBeGreaterThan(3);                        // more than its 3 of the first day: the second day's three (and more)
    expect(res.sent).toBe(400);
  });

  it('a rejected key is final for the run: it is not brought back', async () => {
    const h = harness();
    h.advance(at('2026-11-02T22:00:00Z'));
    const bad: ParallelProvider = { name: 'bad', limits: fast, call: async () => { throw new Error('ai_provider_auth_failed'); } };
    const slowGood: ParallelProvider = { name: 'good', limits: { rpm: 2, lanes: 1 }, call: async (p) => { h.advance(30_000); return `good:${p}`; } };
    const res = await runParallel(reqs(150), [bad, slowGood], h.io);
    expect(res.providers.bad.retired).toBe('key rejected');
    expect(res.providers.bad.revived).toBe(0);
  });

  it('when EVERY provider is used up the run ends at once (nothing waits for tomorrow); the requests stay for the next run', async () => {
    const h = harness();
    const used = (n: string): ParallelProvider => ({ name: n, limits: { rpm: 6000, lanes: 1, rpd: 2 }, call: async (p) => `${n}:${p}` });
    const res = await runParallel(reqs(20), [used('a'), used('b')], h.io);
    expect(res.sent).toBe(4);
    expect(res.failed).toBe(16);
    expect(res.providers.a.retired).toBe('daily budget used');
    expect(h.time()).toBeLessThan(HOUR);
  });

  it('the snapshot says when a retirement ends', async () => {
    const h = harness(); const snaps: RunSnapshot[] = [];
    h.advance(at('2026-11-02T13:00:00Z'));
    const used: ParallelProvider = { name: 'a', limits: { rpm: 6000, lanes: 1, rpd: 1 }, call: async (p) => `a:${p}` };
    await runParallel(reqs(3), [used], h.io, { onSnapshot: (x) => snaps.push(x) });
    expect(snaps[snaps.length - 1].providers.a.retired_until).toBe('2026-11-03T00:01:00.000Z');     // the reset plus a minute
  });
});

describe('the watchdog: a run that answers nothing for too long ends cleanly so the resume cron restarts it', () => {
  it('stops with stalled=true after stallAfterMs without an answer; the waiting requests are not counted as failures', async () => {
    const h = harness();
    const hung: ParallelProvider = { name: 'hung', limits: { rpm: 6000, lanes: 1 }, call: async () => { h.advance(5 * 60_000); throw new Error('hung_http_500'); } };   // every call takes 5 min and fails
    const res = await runParallel(reqs(10), [hung], h.io, { stallAfterMs: 20 * 60_000, maxAttempts: 100 });
    expect(res.stalled).toBe(true);
    expect(res.sent).toBe(0);
    expect(res.failed).toBe(0);
    expect(h.logs.some((l) => /stalled: nothing answered for \d+ min/.test(l))).toBe(true);
    expect(h.time()).toBeLessThan(40 * 60_000);
  });

  it('is not triggered while answers keep coming, however long the run is', async () => {
    const h = harness();
    const res = await runParallel(reqs(300), [ok('a', h, 10_000)], h.io, { stallAfterMs: 20 * 60_000 });
    expect(res.stalled).toBeUndefined();
    expect(res.sent).toBe(300);
  });

  it('is off unless stallAfterMs is given', async () => {
    const h = harness();
    const slow: ParallelProvider = { name: 's', limits: { rpm: 6000, lanes: 1 }, call: async (p) => { h.advance(60 * 60_000); return `s:${p}`; } };
    const res = await runParallel(reqs(3), [slow], h.io);
    expect(res.stalled).toBeUndefined();
    expect(res.sent).toBe(3);
  });
});
