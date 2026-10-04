import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { monitorEventLoopDelay } from 'perf_hooks';
import {
  DEFAULT_SHEDABLE_PREFIXES,
  DEFAULT_THRESHOLDS,
  LoadSnapshot,
  ShedThresholds,
  shouldShed,
} from './shed-classifier';

/**
 * 14.17 — priority load-shedding guard (NOT wired; see WIRING below).
 *
 * When the process is overloaded (event-loop delay and/or heap pressure above
 * threshold) this guard answers `503 + Retry-After` for LOW-priority routes
 * (recommendations, analytics events, nudges, admin reports — configurable)
 * while NEVER shedding auth, checkout, payment webhooks, SOS/ambulance,
 * active calls, or provider order acceptance (hardcoded allowlist in
 * `shed-classifier.ts`, checked first).
 *
 * Overload signals:
 *  - event-loop delay via `perf_hooks.monitorEventLoopDelay` (shared
 *    singleton histogram, p50 read per request — no per-request timers);
 *  - heap via `process.memoryUsage()` (absolute and/or heapUsed/heapTotal).
 *
 * WIRING (owned by a sibling — DO NOT wire here; 2 lines):
 *   // in the target module (NOT global — keep auth/checkout modules exempt):
 *   //   providers: [{ provide: APP_GUARD, useClass: LoadSheddingGuard }],
 *
 * Env overrides (optional): SHED_MAX_LOOP_MS, SHED_MAX_HEAP_RATIO,
 * SHED_RETRY_AFTER_S. Constructor options always win over env.
 */

export interface LoadSheddingOptions {
  /** Extra/low-priority prefixes. Defaults to DEFAULT_SHEDABLE_PREFIXES. */
  shedablePrefixes?: readonly string[];
  /** Trip-points. Defaults to DEFAULT_THRESHOLDS. */
  thresholds?: Partial<ShedThresholds>;
  /** Seconds advertised in the `Retry-After` header. Default 5. */
  retryAfterSeconds?: number;
  /** Injectable snapshot source (tests mock this — no server/timers). */
  getSnapshot?: () => LoadSnapshot;
}

const LOOP_HISTOGRAM = (() => {
  try {
    const h = monitorEventLoopDelay({ resolution: 20 });
    // `unref` so the histogram never keeps the process alive on its own.
    (h as unknown as { unref?: () => void }).unref?.();
    h.enable();
    return h;
  } catch {
    return undefined;
  }
})();

/** Default live snapshot: p50 loop delay (ns→ms) + heap usage. Fail-open. */
export function defaultGetLoadSnapshot(): LoadSnapshot {
  let eventLoopDelayMs = 0;
  try {
    const meanNs = LOOP_HISTOGRAM?.mean;
    if (typeof meanNs === 'number' && Number.isFinite(meanNs)) {
      eventLoopDelayMs = meanNs / 1e6;
    }
  } catch {
    eventLoopDelayMs = 0;
  }
  let heapUsedBytes = 0;
  let heapTotalBytes: number | undefined;
  try {
    const mem = process.memoryUsage();
    heapUsedBytes = mem.heapUsed ?? 0;
    heapTotalBytes = mem.heapTotal;
  } catch {
    heapUsedBytes = 0;
  }
  return { eventLoopDelayMs, heapUsedBytes, heapTotalBytes };
}

function envThresholds(): Partial<ShedThresholds> {
  const out: Partial<ShedThresholds> = {};
  const loopMs = Number(process.env.SHED_MAX_LOOP_MS);
  if (Number.isFinite(loopMs) && loopMs > 0) out.maxEventLoopDelayMs = loopMs;
  const ratio = Number(process.env.SHED_MAX_HEAP_RATIO);
  if (Number.isFinite(ratio) && ratio > 0 && ratio < 1) out.maxHeapUsedRatio = ratio;
  return out;
}

@Injectable()
export class LoadSheddingGuard implements CanActivate {
  private readonly shedablePrefixes: readonly string[];
  private readonly thresholds: ShedThresholds;
  private readonly retryAfterSeconds: number;
  private readonly getSnapshot: () => LoadSnapshot;

  constructor(options: LoadSheddingOptions = {}) {
    this.shedablePrefixes = options.shedablePrefixes ?? DEFAULT_SHEDABLE_PREFIXES;
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...envThresholds(),
      ...(options.thresholds ?? {}),
    };
    this.retryAfterSeconds =
      options.retryAfterSeconds ??
      (Number(process.env.SHED_RETRY_AFTER_S) > 0
        ? Number(process.env.SHED_RETRY_AFTER_S)
        : 5);
    this.getSnapshot = options.getSnapshot ?? defaultGetLoadSnapshot;
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const path: string = String(req?.path ?? req?.url ?? '').split('?')[0];
    let snapshot: LoadSnapshot;
    try {
      snapshot = this.getSnapshot();
    } catch {
      return true; // metrics failure must never take down traffic (fail open)
    }
    if (!shouldShed(path, snapshot, this.thresholds, this.shedablePrefixes)) return true;
    try {
      ctx.switchToHttp().getResponse()?.setHeader?.('Retry-After', String(this.retryAfterSeconds));
      ctx.switchToHttp().getResponse()?.header?.('Retry-After', String(this.retryAfterSeconds));
    } catch {
      // Header best-effort only; the 503 below is the contract.
    }
    throw new ServiceUnavailableException({
      code: 'temporarily_overloaded',
      message: 'Server is busy — please retry shortly',
    });
  }
}
