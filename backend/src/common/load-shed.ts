import { monitorEventLoopDelay } from 'node:perf_hooks';
import { logEvent } from './structured-logger';

/**
 * Load shedding (docs/perf/load-test-2026-10-30.md §6): when one Node process is saturated, answering every request later makes every request slow
 * (the 2026-10-16 spike run: public p95 4.4 s, worst 10.6 s). Instead the cheapest-to-retry requests get a fast `503 server_busy` + `Retry-After`,
 * so the ones that matter (sign-in, payments, bookings, calls, writes, the health probe) keep their latency.
 *
 *   level 0  normal
 *   level 1  the event loop is late (p99 over LOAD_SHED_LAG_MS, default 200 ms) or LOAD_SHED_INFLIGHT (default 120) requests are in flight:
 *            anonymous GET reads are shed. The patient web serves its last good copy of a public page when the API answers 5xx (stale-if-error),
 *            and the nginx micro-cache (stale-if-error too) keeps answering what it holds, so visitors see a page, not an error.
 *   level 2  twice that: signed-in GET reads are shed as well.
 * Never shed: health, sign-in and tokens, payments and their webhooks, checkout, slot locks, calls, realtime, admin and provider consoles, and every
 * write (POST/PUT/PATCH/DELETE): those are protected by their own limits (nginx zones, UserRateLimitGuard, idempotency), and a refused write is worse
 * for the user than a slow one. Off unless LOAD_SHED=on (set per environment after the spike test, not by default).
 */
export type ShedLevel = 0 | 1 | 2;
export type ShedClass = 'never' | 'anonymous_read' | 'user_read';

const NEVER_PATHS = [
  /^\/(api\/v\d+\/)?health(\/|$)/, /^\/health(\/|$)/, /^\/api\/v\d+\/auth(\/|$)/, /^\/api\/v\d+\/payments?(\/|$)/, /^\/api\/v\d+\/webhooks?(\/|$)/,
  /^\/api\/v\d+\/cart\/checkout/, /^\/api\/v\d+\/slot-locks(\/|$)/, /^\/api\/v\d+\/calls?(\/|$)/, /^\/api\/v\d+\/livekit(\/|$)/, /^\/socket\.io(\/|$)/,
  /^\/api\/v\d+\/admin(\/|$)/, /^\/api\/v\d+\/provider(\/|$)/, /^\/api\/v\d+\/(metrics|observability)(\/|$)/, /^\/\.well-known(\/|$)/, /^\/api\/v\d+\/mcp(\/|$)/,
];

export function classifyRequest(method: string, rawUrl: string, headers: Record<string, unknown>): ShedClass {
  if (method !== 'GET' && method !== 'HEAD') return 'never';
  const path = rawUrl.split('?')[0];
  if (NEVER_PATHS.some((re) => re.test(path))) return 'never';
  const signedIn = Boolean(headers.authorization) || /(^|;\s*)(nabd_access|admin_access|nabd_refresh)=/.test(String(headers.cookie ?? ''));
  return signedIn ? 'user_read' : 'anonymous_read';
}

export interface ShedLimits { lagMs: number; inflight: number }
export function limitsFromEnv(env: NodeJS.ProcessEnv): ShedLimits {
  const n = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return { lagMs: n(env.LOAD_SHED_LAG_MS, 200), inflight: n(env.LOAD_SHED_INFLIGHT, 120) };
}

export function levelFor(lagMs: number, inflight: number, limits: ShedLimits): ShedLevel {
  if (lagMs >= limits.lagMs * 2 || inflight >= limits.inflight * 2) return 2;
  if (lagMs >= limits.lagMs || inflight >= limits.inflight) return 1;
  return 0;
}

export const shouldShed = (level: ShedLevel, cls: ShedClass): boolean => cls !== 'never' && (cls === 'anonymous_read' ? level >= 1 : level >= 2);

/** Retry-After in seconds: a little jitter so the retries do not arrive together. */
export const retryAfterSeconds = (random = Math.random()): number => 3 + Math.floor(random * 5);

export interface LoadShedState { level: ShedLevel; lagMs: number; inflight: number; shed: number }

export function createLoadShed(env: NodeJS.ProcessEnv = process.env, now: () => number = Date.now) {
  const limits = limitsFromEnv(env);
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  const state: LoadShedState = { level: 0, lagMs: 0, inflight: 0, shed: 0 };
  let lastLog = 0;
  const refresh = () => {
    // p99 of the delay since the last sample, in ms (the histogram is in ns), then start a fresh window
    state.lagMs = histogram.count > 0 ? histogram.percentile(99) / 1e6 : 0;
    histogram.reset();
    const next = levelFor(state.lagMs, state.inflight, limits);
    if (next !== state.level && now() - lastLog > 5000) {
      lastLog = now();
      logEvent(next > state.level ? 'warn' : 'info', 'load_shed_level', { from: state.level, to: next, lag_ms: Math.round(state.lagMs), inflight: state.inflight, shed_total: state.shed }, 'load-shed');
    }
    state.level = next;
  };
  const timer = setInterval(refresh, 1000);
  timer.unref();

  const middleware = (req: { method: string; url: string; headers: Record<string, unknown> }, res: {
    statusCode: number; setHeader(k: string, v: string | number): void; end(body?: string): void; once(ev: string, fn: () => void): void;
  }, next: () => void) => {
    // the in-flight count also moves the level at once, not only on the next tick
    const level = Math.max(state.level, levelFor(0, state.inflight, limits)) as ShedLevel;
    if (shouldShed(level, classifyRequest(req.method, req.url, req.headers))) {
      state.shed += 1;
      const wait = retryAfterSeconds();
      res.statusCode = 503;
      res.setHeader('Retry-After', wait);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ statusCode: 503, code: 'server_busy', message: 'server_busy_retry', retry_after_seconds: wait }));
      return;
    }
    // streams and long polls stay open for minutes: they are not load, and would keep the in-flight count high
    if (/text\/event-stream/i.test(String(req.headers.accept ?? '')) || /\/stream(\?|$|\/)/.test(req.url)) return next();
    state.inflight += 1;
    let done = false;
    const finish = () => { if (!done) { done = true; state.inflight -= 1; } };
    res.once('finish', finish);
    res.once('close', finish);
    next();
  };
  return { middleware, state, stop: () => { clearInterval(timer); histogram.disable(); } };
}

export const loadShedEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => env.LOAD_SHED === 'on';
