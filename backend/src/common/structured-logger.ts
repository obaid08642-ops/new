/**
 * Phase 20.3 — structured logs, searchable by request id, with PII masked.
 *
 * The plan (16.6) says logs must mask phone, email, national ID and medical
 * data. That belongs in one place, not in every call site, so a caller cannot
 * forget it: `log()` redacts before anything reaches the transport.
 *
 * 20.1/20.3 also want one request id end to end. `log()` reads the id from the
 * AsyncLocalStorage context that the correlation middleware sets, so a log line
 * deep in a service still carries the id of the request that caused it without
 * threading the parameter through every function.
 */
import { Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface LogContext {
  requestId?: string;
  userId?: string;
  role?: string;
}

/** One context per async flow, so a log line knows which request it belongs to. */
const storage = new AsyncLocalStorage<LogContext>();

export function runWithLogContext<T>(ctx: LogContext, fn: () => T): T {
  return storage.run({ ...storage.getStore(), ...ctx }, fn);
}

export function currentLogContext(): LogContext {
  return storage.getStore() ?? {};
}

/**
 * Keys whose values are personal or medical and must never be logged in the
 * clear. Matching is on the key name, so `patient_phone` and `nationalId` are
 * both caught whatever the caller called the variable.
 */
const PII_KEY = /(phone|mobile|tel|email|e_?mail|user_?name|full_?name|first_?name|last_?name|national_?id|nid|iqama|passport|address|diagnosis|prescription|medical_?record|password|token|secret|api_?key|otp|code|cvv|card)/i;

/** Values that look like a phone, an email or a national id even under a bland key. */
const PII_VALUE = [
  /\+?\d[\d\s-]{8,}\d/,                       // phone-like
  /[\w.+-]+@[\w-]+\.[\w.]+/,                  // email-like
  /\b\d{10}\b/,                                // national id / iqama
];

const REDACTED = '[redacted]';

/** Mask one value. Objects are walked; arrays are walked element by element. */
export function maskPii(input: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (Array.isArray(input)) return input.map((v) => maskPii(v, depth + 1));
  if (input && typeof input === 'object') {
    if (input instanceof Date) return input.toISOString();
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = PII_KEY.test(k) ? REDACTED : maskPii(v, depth + 1);
    }
    return out;
  }
  if (typeof input === 'string' && PII_VALUE.some((re) => re.test(input))) return REDACTED;
  return input;
}

/**
 * 20.3 — one JSON line per event, masked, and always carrying the request id.
 *
 * JSON so a log backend can index the fields; the request id is a top-level key
 * so "find every line for this request" is one indexed lookup rather than a
 * regex over free text.
 */
export function logEvent(
  level: 'debug' | 'info' | 'warn' | 'error',
  event: string,
  fields: Record<string, unknown> = {},
  logger: Logger = new Logger('app'),
) {
  const ctx = currentLogContext();
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    request_id: ctx.requestId ?? null,
    user_id: ctx.userId ?? null,
    role: ctx.role ?? null,
    ...(maskPii(fields) as Record<string, unknown>),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') logger.error(line);
  else if (level === 'warn') logger.warn(line);
  else if (level === 'debug') logger.debug(line);
  else logger.log(line);
  return line;
}