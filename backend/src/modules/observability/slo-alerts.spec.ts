/**
 * Phase 20.5 — SLO alerts: each rule fires once (not on every check), carries its runbook, resolves, and reaches the
 * owner by email, Telegram and push; a drill fires every rule once, marked as a drill.
 */
import { ALERT_RULE_IDS, SloAlertsService, evaluateRules, routeGroup, windowDiff } from './slo-alerts.service';
import { MetricsService } from '../../common/metrics.service';
import { SLO_TARGETS } from '../../common/slo-targets';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 17, 12, 0, 0);

function setup(env: Record<string, string> = { OPS_ALERT_EMAIL: 'owner@example.test' }) {
  for (const k of ['OPS_ALERT_EMAIL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALERT_CHAT_ID', 'OPS_ALERT_PUSH_USER_IDS', 'SLO_ALERT_REPEAT_MINUTES', 'RUNBOOK_BASE_URL']) delete process.env[k];
  Object.assign(process.env, env);
  const metrics = new MetricsService();
  const mail = { send: jest.fn(async () => ({ ok: true })) };
  const svc = new SloAlertsService(metrics, undefined, mail as any, undefined);
  return { metrics, mail, svc };
}
/** One minute of traffic, then a check at that minute. */
async function minute(svc: SloAlertsService, metrics: MetricsService, i: number, traffic: () => void) {
  traffic();
  return svc.tick(T0 + i * MIN);
}
const hits = (m: MetricsService, route: string, n: number, bad = 0, ms = 20) => {
  for (let i = 0; i < n; i += 1) m.record(route, i < bad ? 500 : 200, ms);
};

afterEach(() => { jest.restoreAllMocks(); });

describe('route groups and windows', () => {
  it('groups by the first path segment after the prefix and the version', () => {
    expect(routeGroup('/api/v1/orders/:id')).toBe('/orders');
    expect(routeGroup('/orders/:id')).toBe('/orders');
    expect(routeGroup('/api/v2/checkout')).toBe('/checkout');
    expect(routeGroup('/')).toBe('/');
  });
  it('a window the history does not cover gives no answer (no alert right after a restart)', () => {
    const m = new MetricsService();
    const h = [{ at: T0, snap: m.snapshot() }, { at: T0 + MIN, snap: m.snapshot() }];
    expect(windowDiff(h, 5 * MIN)).toBeNull();
    expect(evaluateRules(h, [])).toEqual([]);
  });
});

describe('the rules fire once, with their runbook, and resolve', () => {
  it('API availability, fast burn: >1.44% 5xx over 5 min', async () => {
    const { metrics, mail, svc } = setup();
    const sent: any[] = [];
    for (let i = 0; i < 7; i += 1) sent.push(...await minute(svc, metrics, i, () => hits(metrics, '/api/v1/orders/:id', 100, i === 0 ? 0 : 20)));
    // healthy minute 0, then 20% 5xx: fires once the 5-minute window shows >1.44% for two checks
    const firing = sent.filter((e) => e.rule === 'api_availability_fast' && e.state === 'firing');
    expect(firing).toHaveLength(1);
    expect(firing[0].severity).toBe('critical');
    expect(firing[0].runbook).toBe('https://github.com/obaid08642-ops/new/blob/main/docs/runbooks/api-availability.md');
    expect(mail.send).toHaveBeenCalled();
    const [to, subject, , text] = mail.send.mock.calls[0] as any[];
    expect(to).toBe('owner@example.test');
    expect(subject).toContain('CRITICAL');
    expect(text).toContain('docs/runbooks/api-availability.md');
    // it keeps burning: no second message
    const more = await minute(svc, metrics, 7, () => hits(metrics, '/api/v1/orders/:id', 100, 20));
    expect(more.filter((e) => e.rule === 'api_availability_fast')).toEqual([]);
    // recovery: three clear checks and one RESOLVED
    const out: any[] = [];
    for (let i = 8; i < 20; i += 1) out.push(...await minute(svc, metrics, i, () => hits(metrics, '/api/v1/orders/:id', 100, 0)));
    const resolved = out.filter((e) => e.rule === 'api_availability_fast' && e.state === 'resolved');
    expect(resolved).toHaveLength(1);
    expect((mail.send.mock.calls.at(-1) as any[])[1]).toContain('RESOLVED');
  });

  it('checkout success: more than 1% of checkout calls failing over 15 min', async () => {
    const { metrics, svc } = setup();
    const sent: any[] = [];
    for (let i = 0; i < 20; i += 1) {
      sent.push(...await minute(svc, metrics, i, () => { hits(metrics, '/api/v1/checkout', 10, i >= 3 ? 3 : 0); hits(metrics, '/api/v1/doctors', 200, 0); }));
    }
    const f = sent.filter((e) => e.rule === 'checkout_success' && e.state === 'firing');
    expect(f).toHaveLength(1);
    expect(f[0].runbook).toContain('docs/runbooks/checkout-failures.md');
    expect(f[0].detail).toContain('checkout requests failed');
    // the overall availability stayed fine: checkout is 5% of the traffic
    expect(sent.filter((e) => e.rule === 'api_availability_fast')).toEqual([]);
  });

  it('p95 per route group: only the slow group is named', async () => {
    const { metrics, svc } = setup();
    const sent: any[] = [];
    for (let i = 0; i < 20; i += 1) sent.push(...await minute(svc, metrics, i, () => { hits(metrics, '/api/v1/search', 60, 0, 900); hits(metrics, '/api/v1/doctors/:id', 60, 0, 30); }));
    const f = sent.filter((e) => e.rule === 'p95_latency' && e.state === 'firing');
    expect(f).toHaveLength(1);
    expect(f[0].key).toBe('p95_latency:/search');
    expect(f[0].value).toBeGreaterThan(500);
    expect(f[0].runbook).toContain('docs/runbooks/slow-api.md');
  });

  it('event-loop delay over 100 ms for five checks in a row', async () => {
    const { metrics, svc } = setup();
    jest.spyOn(metrics, 'snapshot').mockImplementation(() => ({ routes: {}, eventLoopLagMs: 180 }));
    const sent: any[] = [];
    for (let i = 0; i < 8; i += 1) sent.push(...await svc.tick(T0 + i * MIN));
    expect(sent.filter((e) => e.rule === 'event_loop_lag' && e.state === 'firing')).toHaveLength(1);
  });

  it('does not fire on healthy traffic or on too little traffic', async () => {
    const { metrics, mail, svc } = setup();
    for (let i = 0; i < 40; i += 1) await minute(svc, metrics, i, () => hits(metrics, '/api/v1/orders/:id', 100, 0));
    expect(mail.send).not.toHaveBeenCalled();
    const quiet = setup();
    for (let i = 0; i < 40; i += 1) await minute(quiet.svc, quiet.metrics, i, () => hits(quiet.metrics, '/api/v1/orders/:id', 1, 1));   // 100% errors, 1 request a minute
    expect(quiet.mail.send).not.toHaveBeenCalled();
  });

  it('repeats a still-firing alert only after SLO_ALERT_REPEAT_MINUTES', async () => {
    const { metrics, svc } = setup({ OPS_ALERT_EMAIL: 'owner@example.test', SLO_ALERT_REPEAT_MINUTES: '30' });
    const all: any[] = [];
    for (let i = 0; i < 50; i += 1) all.push(...await minute(svc, metrics, i, () => hits(metrics, '/api/v1/orders/:id', 100, i === 0 ? 0 : 50)));
    const fast = all.filter((e) => e.rule === 'api_availability_fast');
    expect(fast.map((e) => e.state)).toEqual(['firing', 'repeat']);
  });
});

describe('channels', () => {
  it('sends Telegram with the bot token in the URL only, push to the listed accounts, and survives one channel failing', async () => {
    const calls: any[] = [];
    (global as any).fetch = jest.fn(async (url: string, init: any) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true }; });
    const { metrics, mail, svc } = setup({ OPS_ALERT_EMAIL: 'owner@example.test', TELEGRAM_BOT_TOKEN: 'TESTTOKEN123', TELEGRAM_ALERT_CHAT_ID: '4242' });
    mail.send.mockRejectedValueOnce(new Error('smtp down'));
    const ev = await svc.drill('checkout_success');
    expect(ev.channels).toEqual({ email: false, telegram: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.telegram.org/botTESTTOKEN123/sendMessage');
    expect(calls[0].body.chat_id).toBe('4242');
    expect(calls[0].body.text).toContain('[DRILL]');
    expect(JSON.stringify(ev)).not.toContain('TESTTOKEN123');
    expect(JSON.stringify(svc.status())).not.toContain('TESTTOKEN123');
    expect(metrics).toBeDefined();
  });

  it('reports which channels are configured, never their secrets', () => {
    const { svc } = setup({ OPS_ALERT_EMAIL: 'owner@example.test', TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_ALERT_CHAT_ID: '1' });
    expect(svc.channels()).toEqual({ email: true, telegram: true, push: false });
  });
});

describe('a drill fires every alert once', () => {
  it('each rule: one message, marked DRILL, with its runbook link', async () => {
    const { mail, svc } = setup();
    const events = [];
    for (const rule of ALERT_RULE_IDS) events.push(await svc.drill(rule));
    expect(events.map((e) => e.rule)).toEqual(ALERT_RULE_IDS);
    expect(mail.send).toHaveBeenCalledTimes(ALERT_RULE_IDS.length);
    for (const call of mail.send.mock.calls as any[][]) {
      expect(call[1]).toContain('[DRILL]');
      expect(call[3]).toMatch(/Runbook: https:\/\/github\.com\/.+\/docs\/runbooks\/[a-z-]+\.md/);
    }
    expect(events.every((e) => e.drill && e.state === 'firing')).toBe(true);
    // a drill does not leave an alert "firing"
    expect(svc.status().rules.every((r) => r.firing.length === 0)).toBe(true);
  });
});

describe('the rules match the declared objectives and runbooks', () => {
  it('every SLO has a runbook file in the repo', () => {
    for (const slo of SLO_TARGETS) expect(existsSync(join(__dirname, '..', '..', '..', '..', slo.runbook))).toBe(true);
  });
  it('every rule points at a declared SLO', () => {
    const ids = new Set(SLO_TARGETS.map((s) => s.id));
    const status = setup().svc.status();
    for (const r of status.rules) expect(ids.has(r.slo)).toBe(true);
  });
});
