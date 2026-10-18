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
import { processRole } from './process-role';

export interface LogContext {
  requestId?: string;
  userId?: string;
  role?: string;
  /** Where the request came from; used by the medical access log (16.9), never written to ordinary log lines. */
  ip?: string;
  userAgent?: string;
  deviceId?: string;
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
 * Called by the auth guard once the caller is known: every later line of this request carries the account id (the id
 * only, never a name, phone or e-mail). A no-op outside a request context.
 */
export function setLogUser(userId: unknown, role?: unknown) {
  const store = storage.getStore();
  if (!store) return;
  const id = userId === undefined || userId === null ? '' : String(userId);
  if (id) store.userId = id;
  if (role) store.role = String(role);
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

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];
const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** `LOG_LEVEL` as one of the four levels, or null when it is unset or not one of them. */
export function normaliseLogLevel(raw: unknown): LogLevel | null {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'warning') return 'warn';
  return (LOG_LEVELS as readonly string[]).includes(v) ? (v as LogLevel) : null;
}

/**
 * 20.3 — the level this process logs at: `LOG_LEVEL` (debug|info|warn|error) when set, otherwise `info` in production
 * and `debug` everywhere else. A value that is not one of the four falls back to that default instead of silencing the
 * logs (a typo in the env file must not blind the operators).
 */
export function resolveLogLevel(env: NodeJS.ProcessEnv = process.env): LogLevel {
  return normaliseLogLevel(env.LOG_LEVEL) ?? (env.NODE_ENV === 'production' ? 'info' : 'debug');
}

export function isLevelEnabled(level: LogLevel, env: NodeJS.ProcessEnv = process.env): boolean {
  return ORDER[level] >= ORDER[resolveLogLevel(env)];
}

/** Which process wrote the line: the API (`backend`) or the queue/cron `worker` (compose PROCESS_ROLE). */
export function logService(env: NodeJS.ProcessEnv = process.env): 'backend' | 'worker' {
  return processRole(env) === 'worker' ? 'worker' : 'backend';
}

/** One log line. Every key is always present (null when it does not apply), so a log backend can index them. */
export interface LogRecord {
  ts: string;
  level: LogLevel;
  service: 'backend' | 'worker';
  module: string;
  event: string;
  request_id: string | null;
  user_id: string | null;
  route: string | null;
  status: number | null;
  duration_ms: number | null;
  /** Everything else the caller passed, after maskPii. */
  details: Record<string, unknown> | null;
}

/** Keys of the fields bag that become top-level columns instead of `details`. */
const TOP_LEVEL_KEYS = new Set(['module', 'route', 'status', 'duration_ms', 'request_id', 'user_id']);

function numberOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function stringOrNull(v: unknown, max = 200): string | null {
  if (v === undefined || v === null || v === '') return null;
  return String(v).slice(0, max);
}

/** Build the record for one event: the request context is read here, PII is masked here. */
export function buildLogRecord(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
  module = 'app',
): LogRecord {
  const ctx = currentLogContext();
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) if (!TOP_LEVEL_KEYS.has(k)) rest[k] = v;
  const details = Object.keys(rest).length ? (maskPii(rest) as Record<string, unknown>) : null;
  return {
    ts: new Date().toISOString(),
    level,
    service: logService(),
    module: stringOrNull(fields.module ?? module, 64) ?? 'app',
    event: String(event).slice(0, 96),
    request_id: stringOrNull(fields.request_id) ?? ctx.requestId ?? null,
    user_id: stringOrNull(fields.user_id) ?? ctx.userId ?? null,
    route: stringOrNull(fields.route),
    status: numberOrNull(fields.status),
    duration_ms: numberOrNull(fields.duration_ms),
    details,
  };
}

/** Extra destinations for a line (the Mongo store for warn and error). A sink must never throw or log. */
export type LogSink = (record: LogRecord, line: string) => void;
const sinks = new Set<LogSink>();

export function addLogSink(sink: LogSink): () => void {
  sinks.add(sink);
  return () => { sinks.delete(sink); };
}

type LogOutput = (line: string) => void;
const stdoutOutput: LogOutput = (line) => { process.stdout.write(`${line}\n`); };
let output: LogOutput = stdoutOutput;

/** Tests capture the lines with this; pass nothing to restore stdout. */
export function setLogOutput(fn?: LogOutput) {
  output = fn ?? stdoutOutput;
}

/** Write one record: JSON on stdout (the container's json-file driver, capped at 20m x 3), then the sinks. */
export function emitLog(record: LogRecord): string {
  const line = JSON.stringify(record);
  output(line);
  for (const sink of sinks) {
    try { sink(record, line); } catch { /* a sink must not break the request that logged */ }
  }
  return line;
}

/**
 * 20.3 — one JSON line per event, masked, and always carrying the request id.
 *
 * JSON so a log backend can index the fields; the request id is a top-level key so "find every line for this request"
 * is one indexed lookup rather than a regex over free text. `module`, `route`, `status` and `duration_ms` in `fields`
 * become columns of their own; everything else is `details`, after maskPii. The line is dropped when `level` is below
 * LOG_LEVEL. The optional last argument is the module name, or (tests) a Nest Logger that receives the line instead.
 */
export function logEvent(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
  logger?: Logger | string,
) {
  if (!isLevelEnabled(level)) return '';
  const module = typeof logger === 'string' ? logger : undefined;
  const record = buildLogRecord(level, event, fields, module);
  if (logger && typeof logger !== 'string') {
    const line = JSON.stringify(record);
    if (level === 'error') logger.error(line);
    else if (level === 'warn') logger.warn(line);
    else if (level === 'debug') logger.debug(line);
    else logger.log(line);
    return line;
  }
  return emitLog(record);
}
