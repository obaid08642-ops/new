/**
 * Runs a list of model requests over several providers AT THE SAME TIME (2026-10-27). The old runner sent one request after another
 * through a fallback chain: a parked provider, a 429 or an exhausted chain made every request wait out a backoff, and a production run
 * answered about 1 request a minute. Here each provider has its own lanes, its own request spacing (its RPM), its own daily budget
 * (requests and tokens) and its own parking, all independent: throughput is the sum of the providers, and a provider that is limited
 * only slows itself down.
 *
 * Limits are adaptive: a provider that answers 429 doubles its spacing and parks for a while (exponentially longer on repeats); a run
 * of successes brings the spacing back to its base. A request that fails on one provider goes back to the queue for the others.
 */
import type { Caller } from '../modules/ai/env-chain';

export interface ProviderLimits {
  /** Requests per minute the provider allows (spacing between starts = 60000 / rpm). */
  rpm: number;
  /** Requests this run may send to the provider (0 = unlimited). */
  rpd?: number;
  /** Estimated tokens (prompt + answer) this run may send to the provider (0 = unlimited). */
  tokens_per_day?: number;
  /** Requests in flight at once (default 3): one slow answer must not hold the provider's rate back. */
  lanes?: number;
}

export interface ParallelProvider { name: string; call: Caller; limits: ProviderLimits }

export interface ParallelRequest { id: string; prompt: string }

export interface ProviderStats {
  sent: number; ok: number; limited: number; errors: number; avg_latency_ms: number; parked_ms: number; retired: string | null;
  /** answers that failed the content checks (not written; the request goes to another provider) */
  rejected: number;
  /** why: error classes (http_NNN, timeout, network, empty, auth, other) and rejection reasons: counts only, never message text */
  error_classes: Record<string, number>;
  /** ISO time until which the provider is parked, null when it is not */
  parked_until: string | null;
}

/** What /tmp/translate-work/stats.json holds: counts only, no message, no key, no prompt. */
export interface RunSnapshot {
  at: string; answered: number; remaining: number; failed: number; last_answer_at: string | null; started_at: string;
  providers: Record<string, ProviderStats>;
}

export interface ParallelIo {
  done: Set<string>;
  write(line: string): void;
  sleep(ms: number): Promise<void>;
  now(): number;
  log(line: string): void;
}

export interface ParallelResult { sent: number; skipped: number; failed: number; providers: Record<string, ProviderStats> }

export interface ParallelOptions {
  /** A request that fails this many times (on any providers) is given up for this run; it stays unanswered. */
  maxAttempts?: number;
  /** A status line every this many answers. */
  statusEvery?: number;
  /** Approximate tokens of a text (prompt in, answer out ~ the same size for translation). */
  tokensOf?: (s: string) => number;
  /** The content checks on an answer: null = accepted, else a short reason (a fixed word). A rejected answer is not written and is asked of another provider. */
  validate?: (id: string, text: string) => string | null;
  /** Called with a snapshot (counts only) at most every `snapshotEveryMs` and once at the end. */
  onSnapshot?: (s: RunSnapshot) => void;
  snapshotEveryMs?: number;
}

/** A fixed vocabulary for what went wrong, so no raw error text (which can carry a key) ever reaches a log or a file. */
export function errorClass(e: unknown): string {
  const msg = String((e as Error)?.message || e);
  const name = String((e as Error)?.name || '');
  const http = /_http_(\d{3})\b/.exec(msg);
  if (http) return `http_${http[1]}`;
  if (msg === 'ai_provider_auth_failed') return 'auth';
  if (/_quota_exhausted$/.test(msg)) return 'quota';
  if (/_no_preferred_free_model$/.test(msg)) return 'no_model';
  if (/_empty_response$/.test(msg)) return 'empty';
  if (/TimeoutError|AbortError/.test(name) || /aborted|timed? ?out|timeout/i.test(msg)) return 'timeout';
  if (/fetch failed|ECONN|ENOTFOUND|EAI_AGAIN|socket|network|certificate/i.test(msg)) return 'network';
  return 'other';
}

const isLimited = (cls: string): boolean => cls === 'http_429';
const isAuth = (cls: string): boolean => cls === 'auth';
/** No balance (402) or an account out of quota (429 insufficient_quota): neither heals by waiting, so the provider is retired at once and its requests go to the others. */
const isExhausted = (cls: string): boolean => cls === 'quota' || cls === 'http_402';
const isClient4xx = (cls: string): boolean => /^http_4\d\d$/.test(cls) && cls !== 'http_429' && cls !== 'http_408' && cls !== 'http_402';
const MAX_PARK_MS = 10 * 60_000;
// A 429 is a limit, not a verdict: the provider is parked longer and longer (up to MAX_PARK_MS), never retired for it. A 4xx other than 429/408 is retired only
// after a long unbroken streak with no success in between, so one wrong setting at the start cannot end a run.
const RETIRE_AFTER_CLIENT_ERRORS = 10;
const RETIRE_AFTER_REJECTED = 10;

export async function runParallel(reqs: ParallelRequest[], providers: ParallelProvider[], io: ParallelIo, opts: ParallelOptions = {}): Promise<ParallelResult> {
  const maxAttempts = opts.maxAttempts ?? 6;
  const statusEvery = opts.statusEvery ?? 50;
  const tokensOf = opts.tokensOf ?? ((s: string) => Math.ceil(s.length / 3));
  let skipped = 0;
  const queue: Array<{ req: ParallelRequest; attempts: number; tried: Set<string> }> = [];
  for (const r of reqs) { if (io.done.has(r.id)) skipped += 1; else queue.push({ req: r, attempts: 0, tried: new Set() }); }
  const total = queue.length;
  let sent = 0; let failed = 0; let inFlight = 0; let lastStatus = 0; let lastAnswerAt: string | null = null; let lastSnapshot = -Infinity;
  const startedAt = new Date(io.now()).toISOString();
  const snapshotEveryMs = opts.snapshotEveryMs ?? 30_000;

  const stats: Record<string, ProviderStats> = {};
  const state = new Map<string, { base: number; interval: number; nextStart: number; parkedUntil: number; limitedStreak: number; clientStreak: number; rejectedStreak: number; okStreak: number; level: number; reqs: number; tokens: number; latencySum: number; retired: boolean }>();
  for (const p of providers) {
    stats[p.name] = { sent: 0, ok: 0, limited: 0, errors: 0, rejected: 0, avg_latency_ms: 0, parked_ms: 0, retired: null, error_classes: {}, parked_until: null };
    const base = Math.ceil(60_000 / Math.max(0.1, p.limits.rpm));
    state.set(p.name, { base, interval: base, nextStart: 0, parkedUntil: 0, limitedStreak: 0, clientStreak: 0, rejectedStreak: 0, okStreak: 0, level: 0, reqs: 0, tokens: 0, latencySum: 0, retired: false });
  }

  const status = () => {
    const per = providers.map((p) => `${p.name}=${stats[p.name].ok}${stats[p.name].limited ? `/429:${stats[p.name].limited}` : ''}${stats[p.name].retired ? '/retired' : ''}`).join(' ');
    io.log(`status: answered ${sent}/${total} failed ${failed} pending ${queue.length + inFlight} | ${per}`);
  };

  const snapshot = (): RunSnapshot => {
    const now = io.now();
    const providersOut: Record<string, ProviderStats> = {};
    for (const p of providers) providersOut[p.name] = { ...stats[p.name], error_classes: { ...stats[p.name].error_classes }, parked_until: state.get(p.name)!.parkedUntil > now ? new Date(state.get(p.name)!.parkedUntil).toISOString() : null };
    return { at: new Date(now).toISOString(), started_at: startedAt, answered: sent, remaining: queue.length + inFlight, failed, last_answer_at: lastAnswerAt, providers: providersOut };
  };
  const maybeSnapshot = (force = false) => {
    if (!opts.onSnapshot) return;
    const now = io.now();
    if (!force && now - lastSnapshot < snapshotEveryMs) return;
    lastSnapshot = now;
    try { opts.onSnapshot(snapshot()); } catch { /* a stats file that cannot be written never stops the run */ }
  };
  const tally = (s: ProviderStats, cls: string) => { s.error_classes[cls] = (s.error_classes[cls] ?? 0) + 1; };
  const park = (st: { parkedUntil: number }, s: ProviderStats, ms: number) => { st.parkedUntil = io.now() + ms; s.parked_ms += ms; };

  const retire = (p: ParallelProvider, why: string) => { state.get(p.name)!.retired = true; stats[p.name].retired = why; };

  const lane = async (p: ParallelProvider) => {
    const st = state.get(p.name)!;
    const s = stats[p.name];
    for (;;) {
      maybeSnapshot();
      if (st.retired) return;
      if (!queue.length && !inFlight) return;
      if (!queue.length) { await io.sleep(200); continue; }     // others may still hand a failed request back
      const t0 = io.now();
      const wait = Math.max(st.nextStart, st.parkedUntil) - t0;
      if (wait > 0) { await io.sleep(Math.min(wait, 1000)); continue; }
      // a request this provider has not failed yet goes first; otherwise the oldest one
      const idx = Math.max(0, queue.findIndex((q) => !q.tried.has(p.name)));
      const item = queue.splice(idx, 1)[0];
      const cost = tokensOf(item.req.prompt) * 2;
      if ((p.limits.rpd && st.reqs >= p.limits.rpd) || (p.limits.tokens_per_day && st.tokens + cost > p.limits.tokens_per_day)) {
        queue.unshift(item); retire(p, 'daily budget used'); return;
      }
      st.nextStart = t0 + st.interval;
      st.reqs += 1; st.tokens += cost; s.sent += 1; inFlight += 1;
      const started = io.now();
      try {
        const text = await p.call(item.req.prompt);
        const dt = io.now() - started;
        st.latencySum += dt; s.ok += 1; s.avg_latency_ms = Math.round(st.latencySum / s.ok);
        st.limitedStreak = 0; st.clientStreak = 0; st.okStreak += 1;
        if (st.okStreak >= 3) { st.interval = Math.max(st.base, Math.floor(st.interval * 0.8)); st.level = Math.max(0, st.level - 1); st.okStreak = 0; }
        const why = opts.validate ? opts.validate(item.req.id, text) : null;
        if (why) {
          // the provider answered but not a usable translation: not written, asked of another provider; it is not parked (it is up), only retired if it keeps failing the checks
          inFlight -= 1; s.rejected += 1; tally(s, `rejected_${why}`); st.rejectedStreak += 1;
          item.attempts += 1; item.tried.add(p.name);
          if (st.rejectedStreak >= RETIRE_AFTER_REJECTED) retire(p, 'its answers keep failing the checks');
          if (item.attempts >= maxAttempts) failed += 1; else queue.push(item);
          continue;
        }
        st.rejectedStreak = 0;
        io.write(JSON.stringify({ id: item.req.id, text }));
        io.done.add(item.req.id);
        sent += 1; inFlight -= 1; lastAnswerAt = new Date(io.now()).toISOString();
        if (sent - lastStatus >= statusEvery) { lastStatus = sent; status(); }
      } catch (e) {
        inFlight -= 1;
        const cls = errorClass(e);
        tally(s, cls);
        st.okStreak = 0;
        item.attempts += 1; item.tried.add(p.name);
        if (isAuth(cls)) { retire(p, 'key rejected'); s.errors += 1; }
        else if (isExhausted(cls)) { retire(p, 'no balance or quota left'); s.errors += 1; }
        else if (cls === 'no_model') { retire(p, 'no preferred free model'); s.errors += 1; }
        else if (cls === 'empty') {
          // the answer came back with no text (a reasoning model that spent its tokens thinking): the provider is up, so it is not parked; the request is asked again, of another provider first
          s.errors += 1; st.clientStreak += 1;
          if (st.clientStreak >= RETIRE_AFTER_CLIENT_ERRORS) retire(p, 'answers keep coming back empty');
        }
        else if (isLimited(cls)) {
          s.limited += 1; st.limitedStreak += 1; st.clientStreak = 0;
          st.interval = Math.min(st.interval * 2, 60_000);
          park(st, s, Math.min(30_000 * 2 ** st.level, MAX_PARK_MS));
          st.level += 1;
        } else {
          s.errors += 1;
          // 400/402/404/405/422...: the request itself (or the model, or the account) is refused, parking does not heal it
          st.clientStreak = isClient4xx(cls) ? st.clientStreak + 1 : 0;
          park(st, s, Math.min(10_000 * 2 ** Math.min(st.level, 4), MAX_PARK_MS));
          st.level += 1;
          if (st.clientStreak >= RETIRE_AFTER_CLIENT_ERRORS) retire(p, `refused by the provider (${cls})`);
        }
        if (item.attempts >= maxAttempts) failed += 1;
        else queue.push(item);
      }
    }
  };

  const lanes: Promise<void>[] = [];
  for (const p of providers) for (let i = 0; i < (p.limits.lanes ?? 3); i += 1) lanes.push(lane(p));
  await Promise.all(lanes);
  // requests nobody could take (every provider retired) stay unanswered: counted, not lost
  failed += queue.length;
  status();
  maybeSnapshot(true);
  return { sent, skipped, failed, providers: stats };
}
