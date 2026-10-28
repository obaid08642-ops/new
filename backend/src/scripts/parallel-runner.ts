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

export interface ProviderStats { sent: number; ok: number; limited: number; errors: number; avg_latency_ms: number; parked_ms: number; retired: string | null }

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
}

const isLimited = (code: string): boolean => /_http_429\b/.test(code);
const isAuth = (code: string): boolean => code === 'ai_provider_auth_failed';
const MAX_PARK_MS = 10 * 60_000;
const RETIRE_AFTER_LIMITED = 6;

export async function runParallel(reqs: ParallelRequest[], providers: ParallelProvider[], io: ParallelIo, opts: ParallelOptions = {}): Promise<ParallelResult> {
  const maxAttempts = opts.maxAttempts ?? 6;
  const statusEvery = opts.statusEvery ?? 50;
  const tokensOf = opts.tokensOf ?? ((s: string) => Math.ceil(s.length / 3));
  let skipped = 0;
  const queue: Array<{ req: ParallelRequest; attempts: number; tried: Set<string> }> = [];
  for (const r of reqs) { if (io.done.has(r.id)) skipped += 1; else queue.push({ req: r, attempts: 0, tried: new Set() }); }
  const total = queue.length;
  let sent = 0; let failed = 0; let inFlight = 0; let lastStatus = 0;

  const stats: Record<string, ProviderStats> = {};
  const state = new Map<string, { base: number; interval: number; nextStart: number; parkedUntil: number; limitedStreak: number; okStreak: number; level: number; reqs: number; tokens: number; latencySum: number; retired: boolean }>();
  for (const p of providers) {
    stats[p.name] = { sent: 0, ok: 0, limited: 0, errors: 0, avg_latency_ms: 0, parked_ms: 0, retired: null };
    const base = Math.ceil(60_000 / Math.max(0.1, p.limits.rpm));
    state.set(p.name, { base, interval: base, nextStart: 0, parkedUntil: 0, limitedStreak: 0, okStreak: 0, level: 0, reqs: 0, tokens: 0, latencySum: 0, retired: false });
  }

  const status = () => {
    const per = providers.map((p) => `${p.name}=${stats[p.name].ok}${stats[p.name].limited ? `/429:${stats[p.name].limited}` : ''}${stats[p.name].retired ? '/retired' : ''}`).join(' ');
    io.log(`status: answered ${sent}/${total} failed ${failed} pending ${queue.length + inFlight} | ${per}`);
  };

  const retire = (p: ParallelProvider, why: string) => { state.get(p.name)!.retired = true; stats[p.name].retired = why; };

  const lane = async (p: ParallelProvider) => {
    const st = state.get(p.name)!;
    const s = stats[p.name];
    for (;;) {
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
        st.limitedStreak = 0; st.okStreak += 1;
        if (st.okStreak >= 3) { st.interval = Math.max(st.base, Math.floor(st.interval * 0.8)); st.level = Math.max(0, st.level - 1); st.okStreak = 0; }
        io.write(JSON.stringify({ id: item.req.id, text }));
        io.done.add(item.req.id);
        sent += 1; inFlight -= 1;
        if (sent - lastStatus >= statusEvery) { lastStatus = sent; status(); }
      } catch (e) {
        inFlight -= 1;
        const code = String((e as Error)?.message || e).replace(/\s+/g, ' ').slice(0, 60);
        st.okStreak = 0;
        item.attempts += 1; item.tried.add(p.name);
        if (isAuth(code)) { retire(p, 'key rejected'); s.errors += 1; }
        else if (isLimited(code)) {
          s.limited += 1; st.limitedStreak += 1;
          st.interval = Math.min(st.interval * 2, 60_000);
          const park = Math.min(30_000 * 2 ** st.level, MAX_PARK_MS);
          st.level += 1; st.parkedUntil = io.now() + park; s.parked_ms += park;
          if (st.limitedStreak >= RETIRE_AFTER_LIMITED) retire(p, 'limited again and again (daily limit presumed)');
        } else {
          s.errors += 1;
          const park = Math.min(10_000 * 2 ** Math.min(st.level, 4), MAX_PARK_MS);
          st.level += 1; st.parkedUntil = io.now() + park; s.parked_ms += park;
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
  return { sent, skipped, failed, providers: stats };
}
