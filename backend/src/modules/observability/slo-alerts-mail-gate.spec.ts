/**
 * The persistent mail gate (owner, 2026-11-14: 38 "API availability CRITICAL" mails overnight). #2624 kept its "first 2 fires" state in process memory, so every restart mailed again.
 * Now a critical alert is mailed at most once per alert key per SLO_ALERT_MAIL_GATE_MINUTES (120) through a shared Redis `SET NX EX`; a restart is a NEW instance on the SAME store.
 */
import { SloAlertsService, MAIL_GATE_MINUTES } from './slo-alerts.service';
import { MetricsService } from '../../common/metrics.service';
import { RedisService } from '../redis/redis.service';

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 14, 3, 0, 0);

/** A shared "Redis": SET key value EX seconds NX with a clock the spec moves. */
class FakeRedis {
  store = new Map<string, number>();   // key -> expires at (ms)
  now = T0;
  calls: any[][] = [];
  async set(key: string, _v: string, _ex: string, secs: number, _nx: string) {
    this.calls.push([key, secs]);
    const exp = this.store.get(key);
    if (exp !== undefined && exp > this.now) return null;
    this.store.set(key, this.now + secs * 1000);
    return 'OK';
  }
}
const moduleRefOf = (redis: FakeRedis | 'broken') => ({
  get: jest.fn((token: unknown) => {
    if (token !== RedisService) throw new Error('unexpected token');
    if (redis === 'broken') return { getClient: () => ({ set: async () => { throw new Error('ECONNREFUSED'); } }) };
    return { getClient: () => redis };
  }),
});

function instance(redis: FakeRedis | 'broken' | undefined) {
  delete process.env.SLO_ALERT_MAIL_GATE_MINUTES;
  process.env.OPS_ALERT_EMAIL = 'owner@example.test';
  for (const k of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALERT_CHAT_ID', 'OPS_ALERT_PUSH_USER_IDS']) delete process.env[k];
  const mail = { send: jest.fn(async () => ({ ok: true })) };
  const svc = new SloAlertsService(new MetricsService(), undefined, mail as any, redis ? (moduleRefOf(redis) as any) : undefined);
  return { svc, mail };
}
const st = (key = 'api_availability_fast', rule = 'api_availability_fast') => ({ rule, key, consecutiveOn: 2, consecutiveOff: 0, firing: true, since: T0, lastSentAt: T0, value: 5.9, threshold: 1.44, unit: '%', detail: '5.9% of the requests failed' });
const fire = (svc: SloAlertsService, s = st()) => (svc as any).dispatch(s, 'firing', false);
const resolve = (svc: SloAlertsService, s = st()) => (svc as any).dispatch(s, 'resolved', false);

afterEach(() => jest.restoreAllMocks());

describe('a restart does not mail again (the 38-mails bug)', () => {
  it('a new instance on the same store sends nothing for the same alert inside the window', async () => {
    const redis = new FakeRedis();
    const a = instance(redis);
    expect((await fire(a.svc)).held).toBeUndefined();
    expect(a.mail.send).toHaveBeenCalledTimes(1);
    for (let restart = 0; restart < 10; restart += 1) {           // ten restarts: watchdog, deploys, OOM
      const b = instance(redis);
      redis.now += 5 * MIN;
      const ev = await fire(b.svc);
      expect(ev.held).toBe(true);
      expect(b.mail.send).not.toHaveBeenCalled();
    }
    const gateKeys = new Set(redis.calls.map((c) => c[0]));
    expect([...gateKeys]).toEqual(['slo:mailgate:api_availability_fast']);
    expect(redis.calls[0][1]).toBe(MAIL_GATE_MINUTES() * 60);
  });

  it('after the window the next critical event is mailed again', async () => {
    const redis = new FakeRedis();
    const a = instance(redis);
    await fire(a.svc);
    redis.now += 2 * 60 * MIN - 1000;
    expect((await fire(instance(redis).svc)).held).toBe(true);
    redis.now += 2000;
    const c = instance(redis);
    expect((await fire(c.svc)).held).toBeUndefined();
    expect(c.mail.send).toHaveBeenCalledTimes(1);
  });

  it('two processes at once: exactly one mail', async () => {
    const redis = new FakeRedis();
    const api = instance(redis); const other = instance(redis);
    await Promise.all([fire(api.svc), fire(other.svc)]);
    expect(api.mail.send.mock.calls.length + other.mail.send.mock.calls.length).toBe(1);
  });

  it('a different alert key has its own slot', async () => {
    const redis = new FakeRedis();
    const a = instance(redis);
    await fire(a.svc);
    await fire(a.svc, st('checkout_success', 'checkout_success'));
    expect(a.mail.send).toHaveBeenCalledTimes(2);
  });

  it('a RESOLVED event right after the FIRING mail is held too (one mail per alert per 2 h), and is recorded as held', async () => {
    const redis = new FakeRedis();
    const a = instance(redis);
    await fire(a.svc);
    const ev = await resolve(a.svc);
    expect(ev.held).toBe(true);
    expect(a.mail.send).toHaveBeenCalledTimes(1);
  });
});

describe('what the gate does not touch', () => {
  it('a drill always reaches the channels, and does not use up the slot', async () => {
    const redis = new FakeRedis();
    const a = instance(redis);
    await (a.svc as any).dispatch(st(), 'firing', true);
    await (a.svc as any).dispatch(st(), 'firing', true);
    expect(a.mail.send).toHaveBeenCalledTimes(2);
    expect(redis.calls).toHaveLength(0);
  });
});

describe('when Redis is not available', () => {
  it('an unreachable Redis falls back to the in-process gate: still at most one mail per window, never "send everything"', async () => {
    const a = instance('broken');
    await fire(a.svc); await fire(a.svc); await resolve(a.svc);
    expect(a.mail.send).toHaveBeenCalledTimes(1);
  });

  it('no Redis at all (module ref missing): the same in-process gate', async () => {
    const a = instance(undefined);
    await fire(a.svc); await fire(a.svc);
    expect(a.mail.send).toHaveBeenCalledTimes(1);
  });
});

describe('the daily digest counts what the gate held back', () => {
  it('lists the held critical alerts with how many times they fired and resolved', async () => {
    const redis = new FakeRedis();
    const a = instance(redis);
    redis.now = Date.now();
    for (let i = 0; i < 4; i += 1) { await fire(a.svc); await resolve(a.svc); }
    expect(a.mail.send).toHaveBeenCalledTimes(1);               // only the first FIRING went out
    a.mail.send.mockClear();
    expect(await a.svc.sendDigest(Date.now())).toBe(true);
    const [, subject, , text] = a.mail.send.mock.calls[0] as any[];
    expect(subject).toContain('1 held critical alert(s)');
    expect(text).toContain('held back by the mail gate');
    expect(text).toContain('fired 3x, resolved 4x');
  });

  it('nothing held and nothing open = no digest mail', async () => {
    const a = instance(new FakeRedis());
    expect(await a.svc.sendDigest(Date.now())).toBe(false);
  });
});
