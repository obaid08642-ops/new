/**
 * Removes anything that looks like an API key or token from text and event payloads before they reach Sentry or the logs.
 * Defence in depth: error messages must not carry provider bodies in the first place.
 */
const PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\b(?:sk|pk|rk|r8|gsk|AIza|xox[abprs]|ghp|gho|ghs|glpat)[-_][A-Za-z0-9_-]{8,}/g,
  /\bAIza[0-9A-Za-z_-]{20,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g,
  /\b(?:api[_-]?key|token|secret|password|authorization)(["']?\s*[:=]\s*["']?)[^\s"',;&]{4,}/gi,
  /\b[A-Za-z0-9]{32,}\b/g,
];

export const REDACTED = '[redacted]';

export function scrubSecrets(text: string): string {
  let out = text;
  for (const re of PATTERNS) out = out.replace(re, (m: string, sep?: string) => (typeof sep === 'string' ? `${m.slice(0, m.length - m.replace(/^[^:=]*[:=]["']?\s*["']?/, '').length)}${REDACTED}` : REDACTED));
  return out;
}

/** Scrubs every string in a JSON-like value (depth-limited, cycle-safe); returns the same object. */
export function scrubDeep<T>(value: T, depth = 0, seen = new WeakSet<object>()): T {
  if (typeof value === 'string') return scrubSecrets(value) as unknown as T;
  if (value === null || typeof value !== 'object' || depth > 8 || seen.has(value as object)) return value;
  seen.add(value as object);
  const rec = value as Record<string, unknown>;
  for (const k of Object.keys(rec)) rec[k] = scrubDeep(rec[k], depth + 1, seen);
  return value;
}
