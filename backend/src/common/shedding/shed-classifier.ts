/**
 * 14.17 — load-shedding request classifier (pure, no Nest imports).
 *
 * Decides which requests may be shed under load. Two tiers:
 *  - `never-shed`  — HARDCODED allowlist. Auth, checkout, payment webhooks,
 *                     SOS/ambulance, active calls, provider order acceptance.
 *                     These are NEVER shed, even if they also appear in the
 *                     configurable shedable list (never-shed wins).
 *  - `shedable`    — low-priority routes (recommendations, analytics events,
 *                     nudges, admin reports). Configurable via constructor
 *                     option; defaults below are a starting point only.
 *  - `normal`      — everything else: never shed, always served.
 *
 * All matching is lowercase, query-stripped, segment-aware
 * (`/auth` matches `/auth/login` but NOT `/authorizations`).
 */

/** Priority tier of a single request path. */
export type RequestPriority = 'never-shed' | 'shedable' | 'normal';

/**
 * HARDCODED never-shed allowlist. Do NOT make this configurable: shedding any
 * of these breaks login, money movement, or emergency care.
 *
 * Covers both `/api/v1/...` and bare (`/...`) mount forms because controllers
 * are registered with relative prefixes (`@Controller('auth')`) and the
 * global prefix may vary by environment.
 */
export const NEVER_SHED_PREFIXES: readonly string[] = [
  // Auth (login, refresh, OTP, passkeys, step-up).
  '/api/v1/auth',
  '/auth',
  // Checkout / money movement (patient checkout, orders checkout).
  '/api/v1/checkout',
  '/checkout',
  '/api/v1/orders/checkout',
  '/orders/checkout',
  // Payment webhooks (Moyasar / providers) — shedding loses money events.
  '/api/v1/payments/webhook',
  '/payments/webhook',
  '/api/v1/webhooks',
  '/webhooks',
  // SOS / ambulance / emergency.
  '/api/v1/sos',
  '/sos',
  '/api/v1/ambulance',
  '/ambulance',
  '/api/v1/emergency',
  '/emergency',
  // Active calls (voice/video signalling, ICE).
  '/api/v1/calls',
  '/calls',
  '/api/v1/voice',
  '/voice',
  // Provider order acceptance — kept as the whole provider-orders subtree so
  // accept/confirm/reject mutations can never be starved by a prefix typo.
  '/api/v1/provider/orders',
  '/provider/orders',
];

/**
 * Default shedable (low-priority) prefixes. CONFIGURABLE — pass your own list
 * to the guard; never-shed still wins on overlap.
 */
export const DEFAULT_SHEDABLE_PREFIXES: readonly string[] = [
  // Personalised recommendations.
  '/api/v1/recommendations',
  '/recommendations',
  // Analytics event ingestion.
  '/api/v1/analytics',
  '/analytics',
  // Behaviour-triggered nudges (engagement module).
  '/api/v1/engagement',
  '/engagement',
  '/api/v1/nudges',
  '/nudges',
  // Admin reports / analytics suites (served stale or retried instead).
  '/api/v1/admin/reports',
  '/admin/reports',
  '/api/v1/admin/analytics',
  '/admin/analytics',
];

/** Lowercase, query/hash-stripped, trailing-slash-trimmed path. */
export function normalizePath(raw: string | undefined | null): string {
  const path = String(raw ?? '')
    .split('?')[0]
    .split('#')[0]
    .trim()
    .toLowerCase();
  if (!path) return '/';
  const withLeading = path.startsWith('/') ? path : `/${path}`;
  return withLeading.length > 1 ? withLeading.replace(/\/+$/, '') : withLeading;
}

/** Segment-aware prefix match: `/auth` matches `/auth/login`, not `/author`. */
export function matchesPrefix(normalizedPath: string, prefix: string): boolean {
  const p = normalizePath(prefix);
  if (p === '/') return normalizedPath === '/';
  return normalizedPath === p || normalizedPath.startsWith(`${p}/`);
}

/** Classify a request path. Never-shed always wins over the shedable list. */
export function classifyRequest(
  rawPath: string | undefined | null,
  shedablePrefixes: readonly string[] = DEFAULT_SHEDABLE_PREFIXES,
): RequestPriority {
  const path = normalizePath(rawPath);
  if (NEVER_SHED_PREFIXES.some((p) => matchesPrefix(path, p))) return 'never-shed';
  if (shedablePrefixes.some((p) => matchesPrefix(path, p))) return 'shedable';
  return 'normal';
}

/** Point-in-time load reading (injected/mocked in tests — never read live here). */
export interface LoadSnapshot {
  /** p50-ish event-loop delay in ms (perf_hooks monitor or timer sample). */
  eventLoopDelayMs: number;
  /** process.memoryUsage().heapUsed in bytes. */
  heapUsedBytes: number;
  /** process.memoryUsage().heapTotal in bytes (needed for ratio checks). */
  heapTotalBytes?: number;
}

/** Overload trip-points. Any single breached signal means overloaded. */
export interface ShedThresholds {
  /** Shed when event-loop delay exceeds this (ms). */
  maxEventLoopDelayMs: number;
  /** Shed when heapUsed exceeds this absolute floor (bytes). Optional. */
  maxHeapUsedBytes?: number;
  /** Shed when heapUsed/heapTotal exceeds this ratio. Optional. */
  maxHeapUsedRatio?: number;
}

export const DEFAULT_THRESHOLDS: ShedThresholds = {
  maxEventLoopDelayMs: 100,
  maxHeapUsedRatio: 0.85,
};

/** Pure overload check. Non-finite/negative readings are ignored (fail open). */
export function isOverloaded(snapshot: LoadSnapshot, thresholds: ShedThresholds): boolean {
  const delay = Number(snapshot?.eventLoopDelayMs);
  if (Number.isFinite(delay) && delay >= 0 && delay > thresholds.maxEventLoopDelayMs) return true;
  const used = Number(snapshot?.heapUsedBytes);
  if (Number.isFinite(used) && used >= 0 && thresholds.maxHeapUsedBytes !== undefined) {
    if (used > thresholds.maxHeapUsedBytes) return true;
  }
  const total = Number(snapshot?.heapTotalBytes);
  if (
    Number.isFinite(used) &&
    used >= 0 &&
    Number.isFinite(total) &&
    total > 0 &&
    thresholds.maxHeapUsedRatio !== undefined
  ) {
    if (used / total > thresholds.maxHeapUsedRatio) return true;
  }
  return false;
}

/**
 * Pure shed decision: shed ONLY low-priority routes AND only while overloaded.
 * Auth / checkout / webhooks / SOS / calls / provider order acceptance always
 * return false here regardless of load.
 */
export function shouldShed(
  rawPath: string | undefined | null,
  snapshot: LoadSnapshot,
  thresholds: ShedThresholds,
  shedablePrefixes: readonly string[] = DEFAULT_SHEDABLE_PREFIXES,
): boolean {
  if (classifyRequest(rawPath, shedablePrefixes) !== 'shedable') return false;
  return isOverloaded(snapshot, thresholds);
}
