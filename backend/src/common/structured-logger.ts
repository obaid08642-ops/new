/**
 * Phase 20 foundation — structured JSON logger helper (ADDITIVE ONLY).
 *
 * Emits single-line JSON records: `{ ts, level, module, requestId, msg, data }`.
 * `data` is deep-redacted by key-name pattern (secrets / tokens / PII) so
 * request bodies and user objects can be attached to logs safely.
 *
 * WIRING (owned by a sibling — DO NOT wire here):
 *   // Option A — use directly in any service:
 *   //   import { logStructured, getModuleLogger } from './common/structured-logger';
 *   // Option B — pair with RequestIdMiddleware (`request-id.middleware.ts`):
 *   //   logStructured('info', 'orders', 'order created',
 *   //     { requestId: getRequestId(req), data: { orderId } });
 *
 * Deliberately framework-free (no Nest/Winston dependency) so it stays
 * usable in scripts, workers, and unit tests.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogOptions {
  requestId?: string;
  data?: unknown;
}

export interface StructuredLogRecord {
  ts: string;
  level: LogLevel;
  module: string;
  requestId?: string;
  msg: string;
  data?: unknown;
}

export const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;
const MAX_SERIALIZED_CHARS = 20_000;

/**
 * Key-name pattern for values that must never land in logs in cleartext:
 * credentials / session material / payment instruments / national ids /
 * contact + identity PII. Mirrors the audit-log redaction list and extends
 * it with PII key names (email/phone/address/dob/...) since logs — unlike
 * audit diffs — routinely carry whole request bodies.
 */
const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|authorization|cookie|set-cookie|session|otp|api[_-]?key|private[_-]?key|national[_-]?id|iqama|passport|iban|card|cvv|cvc|biometric|email|phone|mobile|address|dob|birth|ssn|patient/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function redactForLog(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) return value.map((v) => redactForLog(v, depth + 1, seen));
  if (value && typeof value === 'object') {
    if (seen.has(value as object)) return '[Circular]';
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key)
        ? REDACTED
        : redactForLog((value as Record<string, unknown>)[key], depth + 1, seen);
    }
    return out;
  }
  return value;
}

export function buildLogRecord(
  level: LogLevel,
  module: string,
  message: string,
  opts: StructuredLogOptions = {},
): StructuredLogRecord {
  const record: StructuredLogRecord = {
    ts: new Date().toISOString(),
    level,
    module,
    msg: message,
  };
  if (opts.requestId) record.requestId = opts.requestId;
  if (opts.data !== undefined) {
    const redacted = redactForLog(opts.data);
    try {
      const serialized = JSON.stringify(redacted);
      record.data =
        serialized && serialized.length > MAX_SERIALIZED_CHARS ? REDACTED : redacted;
    } catch {
      record.data = REDACTED;
    }
  }
  return record;
}

/** Emits one JSON line to stdout (stderr for `error`). Returns the record. */
export function logStructured(
  level: LogLevel,
  module: string,
  message: string,
  opts: StructuredLogOptions = {},
): StructuredLogRecord {
  const record = buildLogRecord(level, module, message, opts);
  const line = JSON.stringify(record);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
  return record;
}

/** Bound per-module logger factory. */
export function getModuleLogger(module: string) {
  return {
    debug: (message: string, opts?: StructuredLogOptions) =>
      logStructured('debug', module, message, opts),
    info: (message: string, opts?: StructuredLogOptions) =>
      logStructured('info', module, message, opts),
    warn: (message: string, opts?: StructuredLogOptions) =>
      logStructured('warn', module, message, opts),
    error: (message: string, opts?: StructuredLogOptions) =>
      logStructured('error', module, message, opts),
  };
}
