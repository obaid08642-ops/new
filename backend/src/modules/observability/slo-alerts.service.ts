/**
 * Phase 20.5 — SLO alerts that reach the owner.
 *
 * `common/slo-targets.ts` holds the objectives and `ops/prometheus/nabd-alerts.yml` the rules for a Prometheus; there is no
 * Prometheus on the production server (3.8 GB shared with MongoDB), so nothing evaluated those rules and no alert could
 * fire. This service evaluates the same four objectives inside the API process, once a minute, from the counters
 * MetricsService already keeps, and sends the owner email, Telegram and push notifications, each with its runbook link.
 *
 * It sees only what this process served. When the API is down or unreachable, the external checks of 20.6 and the host
 * monitor (deploy/scripts/monitor.sh) are the ones that speak; this one catches the "up but failing or slow" cases.
 *
 * Rules (windows are diffs of two counter snapshots; a rule needs a minimum of traffic and a window it can fully cover):
 *   api_availability (critical, fast burn)  5xx ratio over 5 min  > 14.4 x the 0.1% budget = 1.44%, for 2 checks, >= 30 requests
 *   api_availability (warning, slow burn)   5xx ratio over 30 min >  6 x the budget         = 0.6%,  for 5 checks, >= 100 requests
 *   checkout_success (critical)             5xx ratio on checkout routes over 15 min > 1% (the 99% target), for 3 checks, >= 10 requests
 *   p95_latency (warning, per route group)  p95 over 15 min > 500 ms, for 3 checks, >= 30 requests in the group
 *   event_loop_lag (warning)                event-loop delay > 100 ms in each of the last 5 checks
 * A firing alert is sent once, repeated every SLO_ALERT_REPEAT_MINUTES (240) while it stays on, and a "resolved" message
 * follows when it has been clear for CLEAR checks.
 *
 * Alert fatigue (owner, 2026-10-27: 59 slow-route mails in 48 h for one group that hovered around its limit):
 *   - hysteresis: a WARNING needs its condition for 15 consecutive checks (15 minutes) to fire and 30 consecutive clear checks to resolve; a
 *     CRITICAL still fires after 2-3 checks and resolves after 5 clear ones;
 *   - a WARNING never goes out by mail, Telegram or push on its own (the two notification-queue rules are the exception: they go out at once): it is recorded (admin page: status() and slo_alert_events, and the
 *     structured log) at most once per group per 6 hours while it stays open, and the owner gets ONE digest mail a day with the warnings of the
 *     last 24 hours and the ones still open;
 *   - a CRITICAL goes out at once through every configured channel, as before.
 */
import { Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ModuleRef } from '@nestjs/core';
import { Connection } from 'mongoose';
import { MailService } from '../mail/mail.module';
import { MetricsService, MetricsSnapshot, percentileFromBuckets } from '../../common/metrics.service';
import { SLO_TARGETS } from '../../common/slo-targets';
import { logEvent } from '../../common/structured-logger';
import { processRole } from '../../common/process-role';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { evaluateQueueBacklog, evaluatesQueueRules, QueueSample, QUEUE_WAITING_WINDOW_MS, QUEUE_FAILED_WINDOW_MS } from './queue-backlog';
import * as nodeCluster from 'node:cluster';

export type AlertRuleId = 'api_availability_fast' | 'api_availability_slow' | 'checkout_success' | 'p95_latency' | 'event_loop_lag' | 'queue_failed' | 'queue_waiting';
export const ALERT_RULE_IDS: AlertRuleId[] = ['api_availability_fast', 'api_availability_slow', 'checkout_success', 'p95_latency', 'event_loop_lag', 'queue_failed', 'queue_waiting'];

/** The notifications delivery queue (notifications.module.ts). */
export const NOTIFICATIONS_QUEUE = 'notifications-delivery';

interface RuleDef { id: AlertRuleId; slo: string; severity: 'critical' | 'warning'; title: string; forChecks: number; /** Consecutive clear checks before it resolves (default: CRITICAL_CLEAR_CHECKS / WARNING_CLEAR_CHECKS by severity). */ clearChecks?: number; /** For a rule that has no SLO target of its own. */ runbook?: string; /** Goes out at once on every configured channel although it is a warning (the notification queue carries the OTP mails). */ immediate?: boolean }
/** Hysteresis (see the header): checks are one minute apart. */
export const WARNING_FIRE_CHECKS = 15;
export const WARNING_CLEAR_CHECKS = 30;
export const CRITICAL_CLEAR_CHECKS = 5;
/** A warning that stays open is recorded again at most this often. */
export const WARNING_REPEAT_MS = 6 * 3_600_000;
/** The daily digest of the warnings goes out at the first check after this hour (UTC); 05:00 UTC is 08:00 in Riyadh. */
const DIGEST_HOUR_UTC = () => Math.min(23, Math.max(0, Number(process.env.SLO_DIGEST_HOUR_UTC ?? 5) || 0));
const RULES: Record<AlertRuleId, RuleDef> = {
  api_availability_fast: { id: 'api_availability_fast', slo: 'api_availability', severity: 'critical', title: 'API availability: the error budget is burning fast', forChecks: 2 },
  api_availability_slow: { id: 'api_availability_slow', slo: 'api_availability', severity: 'warning', title: 'API availability: the error budget is burning', forChecks: 5 },
  checkout_success: { id: 'checkout_success', slo: 'checkout_success', severity: 'critical', title: 'Checkout success rate is under 99%', forChecks: 3 },
  p95_latency: { id: 'p95_latency', slo: 'p95_latency', severity: 'warning', title: 'Slow route group (p95 over 500 ms)', forChecks: WARNING_FIRE_CHECKS },
  event_loop_lag: { id: 'event_loop_lag', slo: 'event_loop_lag', severity: 'warning', title: 'Event-loop delay over 100 ms', forChecks: WARNING_FIRE_CHECKS },
  // The windows are already in the rule (15 and 10 minutes), so one breached check is enough to send.
  queue_failed: { id: 'queue_failed', slo: 'notifications_queue', severity: 'warning', title: 'Notification queue: failed jobs are piling up', forChecks: 1, clearChecks: 3, immediate: true, runbook: 'docs/runbooks/notifications-queue.md' },
  queue_waiting: { id: 'queue_waiting', slo: 'notifications_queue', severity: 'warning', title: 'Notification queue: jobs are waiting too long', forChecks: 1, clearChecks: 3, immediate: true, runbook: 'docs/runbooks/notifications-queue.md' },
};

const clearChecksOf = (rule: AlertRuleId): number => RULES[rule].clearChecks ?? (RULES[rule].severity === 'critical' ? CRITICAL_CLEAR_CHECKS : WARNING_CLEAR_CHECKS);
const TICK_MS = 60_000;
const BUDGET = 1 - 0.999;
const MAX_SNAPSHOTS = 70;     // a bit more than the longest window (30 min) at one per minute, plus slack

export interface Finding { rule: AlertRuleId; key: string; active: boolean; value: number; threshold: number; unit: string; detail: string }
interface AlertState { rule: AlertRuleId; key: string; consecutiveOn: number; consecutiveOff: number; firing: boolean; since: number; lastSentAt: number; value: number; threshold: number; unit: string; detail: string }
interface Stamped { at: number; snap: MetricsSnapshot }

export interface AlertEvent {
  at: Date; rule: AlertRuleId; key: string; state: 'firing' | 'resolved' | 'repeat'; drill: boolean; severity: 'critical' | 'warning';
  value: number; threshold: number; unit: string; detail: string; runbook: string; channels: Record<string, boolean>;
}

/** `/api/v1/orders/:id` -> `/orders` : the first path segment after the prefix and the version. */
export function routeGroup(route: string): string {
  const parts = route.split('/').filter(Boolean);
  if (parts[0] === 'api') parts.shift();
  if (parts[0] && /^v\d+$/.test(parts[0])) parts.shift();
  return `/${parts[0] ?? ''}`;
}

const sumRoutes = (snap: MetricsSnapshot, pick: (route: string) => boolean) => {
  let count = 0; let errors = 0;
  for (const [route, s] of Object.entries(snap.routes)) if (pick(route)) { count += s.count; errors += s.errors; }
  return { count, errors };
};

/** Counters of the last `windowMs`: the newest snapshot minus the one at (or just before) now - window. Null if the history does not cover the window. */
export function windowDiff(history: Stamped[], windowMs: number): { from: MetricsSnapshot; to: MetricsSnapshot } | null {
  if (history.length < 2) return null;
  const to = history[history.length - 1];
  const target = to.at - windowMs;
  let from: Stamped | undefined;
  for (const h of history) { if (h.at <= target + 1000) from = h; else break; }
  return from && from !== to ? { from: from.snap, to: to.snap } : null;
}

function diffRoutes(d: { from: MetricsSnapshot; to: MetricsSnapshot }) {
  const out: Record<string, { count: number; errors: number; buckets: number[] }> = {};
  for (const [route, now] of Object.entries(d.to.routes)) {
    const before = d.from.routes[route];
    const count = now.count - (before?.count ?? 0);
    if (count <= 0) continue;
    out[route] = { count, errors: now.errors - (before?.errors ?? 0), buckets: now.buckets.map((b, i) => b - (before?.buckets[i] ?? 0)) };
  }
  return out;
}

/** Pure evaluation of all rules over the snapshot history. Exported for the specs. */
export function evaluateRules(history: Stamped[], lagSamples: number[]): Finding[] {
  const findings: Finding[] = [];
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  const fast = windowDiff(history, 5 * 60_000);
  if (fast) {
    const r = diffRoutes(fast); const t = Object.values(r).reduce((a, s) => ({ c: a.c + s.count, e: a.e + s.errors }), { c: 0, e: 0 });
    const ratio = t.c ? t.e / t.c : 0;
    findings.push({ rule: 'api_availability_fast', key: 'api_availability_fast', active: t.c >= 30 && ratio > 14.4 * BUDGET, value: ratio, threshold: 14.4 * BUDGET, unit: 'ratio', detail: `${t.e} of ${t.c} requests answered 5xx in the last 5 minutes (${pct(ratio)}; budget ${pct(BUDGET)})` });
  }
  const slow = windowDiff(history, 30 * 60_000);
  if (slow) {
    const r = diffRoutes(slow); const t = Object.values(r).reduce((a, s) => ({ c: a.c + s.count, e: a.e + s.errors }), { c: 0, e: 0 });
    const ratio = t.c ? t.e / t.c : 0;
    findings.push({ rule: 'api_availability_slow', key: 'api_availability_slow', active: t.c >= 100 && ratio > 6 * BUDGET, value: ratio, threshold: 6 * BUDGET, unit: 'ratio', detail: `${t.e} of ${t.c} requests answered 5xx in the last 30 minutes (${pct(ratio)}; budget ${pct(BUDGET)})` });
  }
  const mid = windowDiff(history, 15 * 60_000);
  if (mid) {
    const r = diffRoutes(mid);
    const checkout = Object.entries(r).filter(([route]) => /checkout/i.test(route)).reduce((a, [, s]) => ({ c: a.c + s.count, e: a.e + s.errors }), { c: 0, e: 0 });
    const ratio = checkout.c ? checkout.e / checkout.c : 0;
    const target = SLO_TARGETS.find((x) => x.id === 'checkout_success')!.target;
    findings.push({ rule: 'checkout_success', key: 'checkout_success', active: checkout.c >= 10 && ratio > 1 - target, value: ratio, threshold: 1 - target, unit: 'ratio', detail: `${checkout.e} of ${checkout.c} checkout requests failed (5xx) in the last 15 minutes (${pct(ratio)} failed; target at most ${pct(1 - target)})` });
    // p95 per route group
    const groups = new Map<string, { count: number; buckets: number[] }>();
    for (const [route, s] of Object.entries(r)) {
      const g = routeGroup(route); const cur = groups.get(g) ?? { count: 0, buckets: new Array(s.buckets.length).fill(0) };
      cur.count += s.count; s.buckets.forEach((b, i) => { cur.buckets[i] += b; }); groups.set(g, cur);
    }
    const limit = SLO_TARGETS.find((x) => x.id === 'p95_latency')!.target;
    for (const [g, s] of groups) {
      const p95 = percentileFromBuckets(s.buckets, s.count, 95);
      findings.push({ rule: 'p95_latency', key: `p95_latency:${g}`, active: s.count >= 30 && p95 > limit, value: p95, threshold: limit, unit: 'ms', detail: `p95 of ${g} is ${p95} ms over ${s.count} requests in the last 15 minutes (limit ${limit} ms)` });
    }
  }
  if (lagSamples.length >= 5) {
    const last = lagSamples.slice(-5); const limit = SLO_TARGETS.find((x) => x.id === 'event_loop_lag')!.target;
    findings.push({ rule: 'event_loop_lag', key: 'event_loop_lag', active: last.every((v) => v > limit), value: Math.max(...last), threshold: limit, unit: 'ms', detail: `event-loop delay was over ${limit} ms in each of the last 5 checks (max ${Math.max(...last)} ms)` });
  }
  return findings;
}

  /** What a drill shows for each rule (a sample, not a reading). */
const DRILL_SAMPLE: Record<AlertRuleId, { value: number; threshold: number; unit: string }> = {
  api_availability_fast: { value: 0.05, threshold: 0.01, unit: 'ratio' },
  api_availability_slow: { value: 0.05, threshold: 0.006, unit: 'ratio' },
  checkout_success: { value: 0.05, threshold: 0.01, unit: 'ratio' },
  p95_latency: { value: 650, threshold: 500, unit: 'ms' },
  event_loop_lag: { value: 650, threshold: 100, unit: 'ms' },
  queue_failed: { value: 25, threshold: 20, unit: 'jobs' },
  queue_waiting: { value: 250, threshold: 200, unit: 'jobs' },
};

@Injectable()
export class SloAlertsService implements OnModuleInit, OnModuleDestroy {
  private history: Stamped[] = [];
  private lag: number[] = [];
  private queueSamples: QueueSample[] = [];
  private states = new Map<string, AlertState>();
  private timer?: NodeJS.Timeout;
  readonly sent: AlertEvent[] = [];     // the last events of this process (also stored in slo_alert_events)

  constructor(
    private readonly metrics: MetricsService,
    @Optional() @InjectConnection() private readonly conn?: Connection,
    @Optional() private readonly mail?: MailService,
    @Optional() private readonly moduleRef?: ModuleRef,
  ) {
    // Only one API process judges the shared queue (see evaluatesQueueRules).
    const cluster = nodeCluster as any;
    this.judgesQueue = evaluatesQueueRules({ role: processRole(), clusterWorkerId: cluster.isWorker ? cluster.worker?.id : undefined });
  }

  /** False in every API process but the first cluster worker: the queue is judged once, not once per CPU. */
  judgesQueue: boolean;

  onModuleInit() {
    // The counters live in the process that serves requests: the API (or the single process in development).
    if (process.env.SLO_ALERTS === 'off' || process.env.NODE_ENV === 'test' || processRole() === 'worker') return;
    void this.ensureIndexes();
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref?.();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private async ensureIndexes() {
    try { await this.conn?.collection('slo_alert_events').createIndex({ at: 1 }, { name: 'at_ttl', expireAfterSeconds: 90 * 24 * 3600 }); } catch { /* reported by the next write failing */ }
  }

  /** One evaluation. `now` is injectable for the specs. Returns the events it sent. */
  async tick(now = Date.now()): Promise<AlertEvent[]> {
    const snap = this.metrics.snapshot();
    this.history.push({ at: now, snap });
    if (this.history.length > MAX_SNAPSHOTS) this.history.shift();
    this.lag.push(snap.eventLoopLagMs); if (this.lag.length > 10) this.lag.shift();
    const findings: Finding[] = [...evaluateRules(this.history, this.lag), ...(await this.queueFindings(now))];
    const events: AlertEvent[] = [];
    const repeatMs = Math.max(5, Number(process.env.SLO_ALERT_REPEAT_MINUTES) || 240) * 60_000;
    const seen = new Set<string>();
    for (const f of findings) {
      seen.add(f.key);
      const st = this.states.get(f.key) ?? { rule: f.rule, key: f.key, consecutiveOn: 0, consecutiveOff: 0, firing: false, since: now, lastSentAt: 0, value: f.value, threshold: f.threshold, unit: f.unit, detail: f.detail };
      Object.assign(st, { value: f.value, threshold: f.threshold, unit: f.unit, detail: f.detail });
      if (f.active) { st.consecutiveOn += 1; st.consecutiveOff = 0; } else { st.consecutiveOff += 1; st.consecutiveOn = 0; }
      if (!st.firing && st.consecutiveOn >= RULES[f.rule].forChecks) {
        st.firing = true; st.since = now; st.lastSentAt = now;
        events.push(await this.dispatch(st, 'firing', false));
      } else if (st.firing && f.active && now - st.lastSentAt >= (RULES[f.rule].severity === 'warning' ? WARNING_REPEAT_MS : repeatMs)) {
        st.lastSentAt = now;
        events.push(await this.dispatch(st, 'repeat', false));
      } else if (st.firing && st.consecutiveOff >= clearChecksOf(f.rule)) {
        st.firing = false;
        events.push(await this.dispatch(st, 'resolved', false));
      }
      this.states.set(f.key, st);
    }
    // a key with no finding any more (a route group without traffic) counts as clear
    for (const [key, st] of this.states) {
      if (seen.has(key)) continue;
      st.consecutiveOn = 0; st.consecutiveOff += 1;
      if (st.firing && st.consecutiveOff >= clearChecksOf(st.rule)) { st.firing = false; events.push(await this.dispatch(st, 'resolved', false)); }
    }
    await this.maybeDigest(now);
    return events;
  }

  // ── Daily digest of the warnings (the only mail a warning ever causes) ──────────────────────────────────
  private digestDay = '';
  /** The last digest this process sent (for the admin page and the specs). */
  lastDigest?: { at: Date; subject: string; lines: string[] };

  /**
   * Once a day, at the first check after DIGEST_HOUR_UTC, sends ONE mail with the warnings recorded in the last 24 hours (per group: how many
   * times it fired and resolved) and the ones still open. Nothing to report = no mail. The day is claimed in the database first
   * (`slo_alert_digest`), so several API processes or a restart do not send it twice. Returns whether this call sent it.
   */
  async maybeDigest(now = Date.now()): Promise<boolean> {
    const at = new Date(now);
    const day = at.toISOString().slice(0, 10);
    if (at.getUTCHours() < DIGEST_HOUR_UTC() || this.digestDay === day) return false;
    this.digestDay = day;
    if (this.conn) {
      try {
        await this.conn.collection('slo_alert_digest').updateOne({ _id: 'last' as never, day: { $ne: day } } as never, { $set: { day, at } } as never, { upsert: true });
      } catch { return false; }       // the same day is already claimed (duplicate _id), or the store is down: not sent twice, retried tomorrow
    }
    return this.sendDigest(now);
  }

  async sendDigest(now = Date.now()): Promise<boolean> {
    const since = new Date(now - 24 * 3_600_000);
    let events: AlertEvent[] = this.sent.filter((e) => !e.drill && e.severity === 'warning' && !RULES[e.rule].immediate && e.at >= since);
    if (this.conn) {
      try { events = (await this.conn.collection('slo_alert_events').find({ severity: 'warning', drill: false, rule: { $nin: ALERT_RULE_IDS.filter((r) => RULES[r].immediate) }, at: { $gte: since } }).sort({ at: 1 }).toArray()) as unknown as AlertEvent[]; } catch { /* the events of this process */ }
    }
    const groups = new Map<string, { title: string; fired: number; resolved: number; last: string }>();
    for (const e of events) {
      const g = groups.get(e.key) ?? { title: RULES[e.rule].title, fired: 0, resolved: 0, last: e.detail };
      if (e.state === 'firing') g.fired += 1;
      if (e.state === 'resolved') g.resolved += 1;
      if (e.state !== 'resolved') g.last = e.detail;
      groups.set(e.key, g);
    }
    const open = [...this.states.values()].filter((st) => st.firing && RULES[st.rule].severity === 'warning' && !RULES[st.rule].immediate);
    if (!groups.size && !open.length) return false;
    const lines = [`Warnings in the last 24 hours: ${groups.size} group(s), ${open.length} still open.`];
    for (const [key, g] of groups) {
      const where = key.includes(':') ? ` (${key.split(':')[1]})` : '';
      lines.push(`${g.title}${where}: fired ${g.fired}x, resolved ${g.resolved}x${open.some((o) => o.key === key) ? ', STILL OPEN' : ''}. ${g.last}`);
    }
    for (const st of open) if (!groups.has(st.key)) lines.push(`${RULES[st.rule].title}${st.key.includes(':') ? ` (${st.key.split(':')[1]})` : ''}: STILL OPEN since ${new Date(st.since).toISOString()}. ${st.detail}`);
    lines.push('Warnings are not mailed one by one: they are on the admin alerts page. Critical alerts still arrive at once.');
    const subject = `[Nabd+ DIGEST] ${groups.size + open.filter((o) => !groups.has(o.key)).length} warning group(s) in the last 24 h`;
    this.lastDigest = { at: new Date(now), subject, lines };
    return this.sendEmail(subject, [subject, ...lines]);
  }

  /**
   * Samples the notifications queue (failed and waiting counts) and evaluates the two queue rules. A queue that cannot be
   * read, or is not registered in this process, gives no finding (nothing is judged on a missing sample).
   */
  private async queueFindings(now: number): Promise<Finding[]> {
    if (!this.judgesQueue) return [];
    const queue = this.notificationsQueue();
    if (queue) {
      try {
        const [failed, waiting] = await Promise.all([queue.getFailedCount(), queue.getWaitingCount()]);
        this.queueSamples.push({ at: now, failed, waiting });
      } catch { /* a read that fails is left out: no sample, no judgement */ }
    }
    const keep = Math.ceil((Math.max(QUEUE_FAILED_WINDOW_MS, QUEUE_WAITING_WINDOW_MS) + 2 * 60_000) / TICK_MS);
    if (this.queueSamples.length > keep) this.queueSamples = this.queueSamples.slice(-keep);
    return evaluateQueueBacklog(this.queueSamples, now);
  }

  private notificationsQueue(): Queue | undefined {
    try {
      return this.moduleRef?.get<Queue>(getQueueToken(NOTIFICATIONS_QUEUE), { strict: false });
    } catch { return undefined; }
  }

  /** What the admin sees: the rules, which are firing, and the latest events. */
  status() {
    return {
      rules: ALERT_RULE_IDS.map((id) => ({ id, ...RULES[id], runbook: this.runbookOf(id), firing: [...this.states.values()].filter((s) => s.rule === id && s.firing).map((s) => ({ key: s.key, since: new Date(s.since).toISOString(), detail: s.detail })) })),
      channels: this.channels(),
      recent_events: this.sent.slice(-20),
    };
  }

  /** A drill: sends the real notification of one rule, marked as a drill, through every configured channel. */
  async drill(rule: AlertRuleId, now = Date.now()): Promise<AlertEvent> {
    const def = RULES[rule];
    const sample: AlertState = {
      rule, key: `${rule}:drill`, consecutiveOn: def.forChecks, consecutiveOff: 0, firing: true, since: now, lastSentAt: now,
      value: DRILL_SAMPLE[rule].value, threshold: DRILL_SAMPLE[rule].threshold, unit: DRILL_SAMPLE[rule].unit,
      detail: 'This is a drill: nothing is wrong. It checks that this alert reaches you with its runbook link.',
    };
    return this.dispatch(sample, 'firing', true);
  }

  channels() {
    return { email: !!process.env.OPS_ALERT_EMAIL, telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ALERT_CHAT_ID), push: !!process.env.OPS_ALERT_PUSH_USER_IDS };
  }

  private runbookOf(rule: AlertRuleId): string {
    const path = RULES[rule].runbook ?? SLO_TARGETS.find((t) => t.id === RULES[rule].slo)!.runbook;
    const base = (process.env.RUNBOOK_BASE_URL || 'https://github.com/obaid08642-ops/new/blob/main').replace(/\/+$/, '');
    return `${base}/${path}`;
  }

  private async dispatch(st: AlertState, state: AlertEvent['state'], drill: boolean): Promise<AlertEvent> {
    const def = RULES[st.rule];
    const at = new Date();
    const runbook = this.runbookOf(st.rule);
    const tag = drill ? '[DRILL] ' : '';
    const verb = state === 'resolved' ? 'RESOLVED' : state === 'repeat' ? `STILL ${def.severity.toUpperCase()}` : def.severity.toUpperCase();
    const where = st.key.includes(':') && !drill ? ` (${st.key.split(':')[1]})` : '';
    const subject = `${tag}[Nabd+ ${verb}] ${def.title}${where}`;
    const lines = [
      `${tag}${def.title}${where}`,
      state === 'resolved' ? 'It has cleared.' : st.detail,
      `SLO: ${def.slo} | since ${new Date(st.since).toISOString()}`,
      `Runbook: ${runbook}`,
    ];
    const text = lines.join('\n');
    const channels: Record<string, boolean> = {};
    const ch = this.channels();
    // A WARNING (not a drill) is recorded for the admin page and the daily digest; it never goes out on its own.
    if (def.severity === 'critical' || def.immediate || drill) {
      if (ch.email) channels.email = await this.sendEmail(subject, lines);
      if (ch.telegram) channels.telegram = await this.sendTelegram(`${subject}\n${text.split('\n').slice(1).join('\n')}`);
      if (ch.push) channels.push = await this.sendPush(subject, st.detail);
    }
    const event: AlertEvent = { at, rule: st.rule, key: st.key, state, drill, severity: def.severity, value: st.value, threshold: st.threshold, unit: st.unit, detail: st.detail, runbook, channels };
    this.sent.push(event); if (this.sent.length > 50) this.sent.shift();
    try { await this.conn?.collection('slo_alert_events').insertOne({ ...event }); } catch { /* the notification already went out */ }
    logEvent(def.severity === 'critical' && state !== 'resolved' ? 'error' : 'warn', 'slo_alert', { module: 'observability', rule: st.rule, state, drill, channels: Object.keys(channels).filter((c) => channels[c]) });
    return event;
  }

  private async sendEmail(subject: string, lines: string[]): Promise<boolean> {
    try {
      const to = process.env.OPS_ALERT_EMAIL; if (!to || !this.mail) return false;
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = `<div dir="ltr" style="font-family: system-ui, sans-serif"><h3>${esc(lines[0])}</h3>${lines.slice(1).map((l) => `<p>${esc(l)}</p>`).join('')}</div>`;
      const r = await this.mail.send(to, subject, html, lines.join('\n'));
      return !!r?.ok;
    } catch { return false; }
  }

  private async sendTelegram(text: string): Promise<boolean> {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN; const chat = process.env.TELEGRAM_ALERT_CHAT_ID; if (!token || !chat) return false;
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3800), disable_web_page_preview: true }),
      });
      return res.ok;
    } catch { return false; }       // never log the error: it can carry the bot token in the URL
  }

  private async sendPush(title: string, body: string): Promise<boolean> {
    try {
      const ids = (process.env.OPS_ALERT_PUSH_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!ids.length || !this.moduleRef) return false;
      const { PushService } = await import('../push/push.module');
      const push = this.moduleRef.get(PushService, { strict: false });
      let ok = false;
      for (const id of ids) { try { await push.sendToUser(id, title, body.slice(0, 180), { type: 'ops_alert' }); ok = true; } catch { /* next */ } }
      return ok;
    } catch { return false; }
  }
}
