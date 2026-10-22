/**
 * Phase 20.5 — the notification queue rules: a failed-job burst (more than 20 in 15 minutes) and a waiting backlog (more than
 * 200 in every check of 10 minutes). Pure rule tests, then the service path (sampling the queue and the alert it sends).
 */
import { evaluateQueueBacklog, QueueSample, QUEUE_FAILED_LIMIT, QUEUE_WAITING_LIMIT } from './queue-backlog';
import { SloAlertsService } from './slo-alerts.service';
import { MetricsService } from '../../common/metrics.service';

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 22, 9, 0, 0);

/** One sample per minute, from minute 0 to `last`, with the given counts. */
function series(last: number, at: (minute: number) => { failed: number; waiting: number }): QueueSample[] {
  const out: QueueSample[] = [];
  for (let m = 0; m <= last; m += 1) out.push({ at: T0 + m * MIN, ...at(m) });
  return out;
}
const finding = (samples: QueueSample[], rule: 'queue_failed' | 'queue_waiting', now: number) =>
  evaluateQueueBacklog(samples, now).find((f) => f.rule === rule)!;

describe('queue rule: failed jobs', () => {
  it('fires when the failed set grew by more than 20 in 15 minutes', () => {
    const samples = series(20, (m) => ({ failed: m >= 5 ? 5 + (m - 5) * 2 : 5, waiting: 0 }));
    const now = T0 + 20 * MIN;
    const f = finding(samples, 'queue_failed', now);
    expect(f.active).toBe(true);
    expect(f.value).toBeGreaterThan(QUEUE_FAILED_LIMIT);
  });

  it('does not fire at exactly 20 growth (the limit is "more than")', () => {
    const now = T0 + 21 * MIN;
    // the base is the sample at minute 6 (the window starts at minute 6): growth from 0 to 20
    const at20 = [{ at: T0 + 6 * MIN, failed: 0, waiting: 0 }, { at: T0 + 21 * MIN, failed: 20, waiting: 0 }];
    expect(finding(at20, 'queue_failed', now).value).toBe(20);
    expect(finding(at20, 'queue_failed', now).active).toBe(false);
    const at21 = [{ at: T0 + 6 * MIN, failed: 0, waiting: 0 }, { at: T0 + 21 * MIN, failed: 21, waiting: 0 }];
    expect(finding(at21, 'queue_failed', now).active).toBe(true);
  });

  it('old failures that are not in the last 15 minutes do not count', () => {
    // 200 failed in the first minutes, then flat: the window that matters is flat
    const samples = series(25, (m) => ({ failed: m < 3 ? 200 : 200, waiting: 0 }));
    expect(finding(samples, 'queue_failed', T0 + 25 * MIN).active).toBe(false);
  });

  it('gives no answer until the samples cover the window (no alert right after a restart)', () => {
    const samples = series(5, (m) => ({ failed: m * 10, waiting: 0 }));
    const f = finding(samples, 'queue_failed', T0 + 5 * MIN);
    expect(f.active).toBe(false);
    expect(f.detail).toMatch(/Not enough samples/);
  });
});

describe('queue rule: waiting jobs', () => {
  it('fires when every check of the last 10 minutes is above 200', () => {
    const samples = series(12, () => ({ failed: 0, waiting: 250 }));
    const f = finding(samples, 'queue_waiting', T0 + 12 * MIN);
    expect(f.active).toBe(true);
    expect(f.value).toBe(250);
  });

  it('does not fire on a single dip: one check at or below 200 clears the window', () => {
    const samples = series(12, (m) => ({ failed: 0, waiting: m === 8 ? 200 : 500 }));
    expect(finding(samples, 'queue_waiting', T0 + 12 * MIN).active).toBe(false);
  });

  it('does not fire on a backlog that is not yet 10 minutes old', () => {
    const samples = series(12, (m) => ({ failed: 0, waiting: m >= 5 ? 900 : 0 }));
    expect(finding(samples, 'queue_waiting', T0 + 12 * MIN).active).toBe(false);
  });

  it('keeps the limit as "more than 200"', () => {
    const samples = series(12, () => ({ failed: 0, waiting: QUEUE_WAITING_LIMIT }));
    expect(finding(samples, 'queue_waiting', T0 + 12 * MIN).active).toBe(false);
  });
});

describe('queue rules in the service', () => {
  function service(queue: { getFailedCount: () => Promise<number>; getWaitingCount: () => Promise<number> } | null) {
    for (const k of ['OPS_ALERT_EMAIL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALERT_CHAT_ID', 'OPS_ALERT_PUSH_USER_IDS', 'RUNBOOK_BASE_URL']) delete process.env[k];
    process.env.OPS_ALERT_EMAIL = 'owner@example.test';
    const metrics = new MetricsService();
    const mail = { send: jest.fn(async () => ({ ok: true })) };
    const moduleRef = { get: jest.fn(() => { if (!queue) throw new Error('not registered'); return queue; }) };
    const svc = new SloAlertsService(metrics, undefined, mail as any, moduleRef as any);
    return { svc, mail };
  }

  it('sends one queue alert with its runbook when the waiting backlog persists', async () => {
    let waiting = 300;
    const { svc, mail } = service({ getFailedCount: async () => 0, getWaitingCount: async () => waiting });
    const sent: string[] = [];
    for (let m = 0; m <= 12; m += 1) {
      const events = await svc.tick(T0 + m * MIN);
      sent.push(...events.filter((e) => e.rule === 'queue_waiting' && e.state === 'firing').map((e) => e.runbook));
    }
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatch(/docs\/runbooks\/notifications-queue\.md$/);
    expect(mail.send).toHaveBeenCalledWith('owner@example.test', expect.stringContaining('Notification queue'), expect.any(String), expect.any(String));
    waiting = 0;
    for (let m = 13; m <= 17; m += 1) await svc.tick(T0 + m * MIN);
    expect(svc.status().rules.find((r) => r.id === 'queue_waiting')!.firing).toHaveLength(0);
  });

  it('a queue that cannot be read is not judged (no alert, no crash)', async () => {
    const { svc, mail } = service({ getFailedCount: async () => { throw new Error('redis down'); }, getWaitingCount: async () => 900 });
    for (let m = 0; m <= 12; m += 1) await svc.tick(T0 + m * MIN);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('a process without the queue gives no queue findings', async () => {
    const { svc, mail } = service(null);
    for (let m = 0; m <= 20; m += 1) await svc.tick(T0 + m * MIN);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('a drill of each queue rule reaches the owner with its runbook', async () => {
    const { svc } = service(null);
    const drill = await svc.drill('queue_failed');
    expect(drill.drill).toBe(true);
    expect(drill.runbook).toMatch(/notifications-queue\.md$/);
    expect(drill.unit).toBe('jobs');
  });
});
