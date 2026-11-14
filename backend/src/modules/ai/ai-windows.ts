/**
 * Usage windows of the AI providers' free tiers: the day and the month are counted in the provider's own timezone (Gemini resets
 * its daily quota at midnight Pacific, OpenRouter by UTC day), and a 429 may carry the wait in `Retry-After` or the provider's reset
 * headers. Pure functions, no I/O.
 */

const parts = (tz: string, at: Date): { y: string; m: string; d: string } => {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  return { y: get('year'), m: get('month'), d: get('day') };
};

/** `YYYY-MM-DD` of `at` in `tz` (an unknown zone falls back to UTC). */
export function dayKey(tz: string | undefined, at: Date = new Date()): string {
  try { const p = parts(tz || 'UTC', at); return `${p.y}-${p.m}-${p.d}`; } catch { return at.toISOString().slice(0, 10); }
}

/** `YYYY-MM` of `at` in `tz`. */
export function monthKey(tz: string | undefined, at: Date = new Date()): string {
  return dayKey(tz, at).slice(0, 7);
}

/** First instant after `at` at which `keyOf` changes (binary search over whole seconds; the key is monotonic in time). */
function nextChange(keyOf: (d: Date) => string, at: Date, horizonMs: number): Date {
  const cur = keyOf(at);
  let lo = Math.floor(at.getTime() / 1000);        // whole seconds: resets fall on whole seconds
  let hi = lo + Math.ceil(horizonMs / 1000);
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (keyOf(new Date(mid * 1000)) === cur) lo = mid; else hi = mid;
  }
  return new Date(hi * 1000);
}

/** When the provider's daily window resets (next midnight in its timezone). */
export function nextDayReset(tz: string | undefined, at: Date = new Date()): Date {
  return nextChange((d) => dayKey(tz, d), at, 26 * 3_600_000);
}

/** When the provider's monthly window resets (first instant of the next month in its timezone). */
export function nextMonthReset(tz: string | undefined, at: Date = new Date()): Date {
  return nextChange((d) => monthKey(tz, d), at, 32 * 86_400_000);
}

const MAX_WAIT_SEC = 24 * 3600;

/** `2m59.56s`, `7.66s`, `1h2m`, `250ms` → seconds. */
export function parseDurationSeconds(v: string): number | undefined {
  const re = /(\d+(?:\.\d+)?)(ms|h|m|s)/g;
  let total = 0; let matched = false;
  for (let m = re.exec(v); m; m = re.exec(v)) {
    matched = true;
    const n = Number(m[1]);
    total += m[2] === 'h' ? n * 3600 : m[2] === 'm' ? n * 60 : m[2] === 'ms' ? n / 1000 : n;
  }
  return matched ? total : undefined;
}

type HeaderBag = { get(name: string): string | null };

/**
 * Seconds to wait after a 429, from what the provider sent: `Retry-After` (seconds or an HTTP date), Groq's
 * `x-ratelimit-reset-requests` (a duration), OpenRouter's `X-RateLimit-Reset` (an epoch; seconds or milliseconds).
 * Undefined when there is no usable hint. Clamped to 1 s .. 24 h.
 */
export function retryAfterSeconds(headers: HeaderBag | undefined | null, now: number = Date.now()): number | undefined {
  if (!headers) return undefined;
  const clamp = (s: number) => Math.min(MAX_WAIT_SEC, Math.max(1, Math.ceil(s)));
  const ra = headers.get('retry-after');
  if (ra) {
    if (/^\d+(\.\d+)?$/.test(ra.trim())) return clamp(Number(ra));
    const at = Date.parse(ra);
    if (!Number.isNaN(at)) return clamp((at - now) / 1000);
  }
  const groq = headers.get('x-ratelimit-reset-requests');
  if (groq) { const s = parseDurationSeconds(groq); if (s !== undefined) return clamp(s); }
  const reset = headers.get('x-ratelimit-reset');
  if (reset && /^\d+$/.test(reset.trim())) {
    const n = Number(reset);
    const ms = n > 1e12 ? n : n > 1e9 ? n * 1000 : undefined; // an epoch; a small number is not a timestamp
    if (ms !== undefined) return clamp((ms - now) / 1000);
  }
  return undefined;
}
