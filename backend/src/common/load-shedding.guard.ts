import { Injectable, CanActivate, ExecutionContext, ServiceUnavailableException, SetMetadata, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { monitorEventLoopDelay } from 'perf_hooks';
import { getHeapStatistics } from 'v8';

/**
 * 14.17 — load shedding by priority.
 *
 * When the event loop is saturated or memory is exhausted, low-priority routes
 * answer `503 + Retry-After` instead of queuing behind critical traffic and
 * timing everything out. Shed routes: recommendations, analytics ingestion,
 * nudges, admin reports. NEVER shed: auth, checkout/payment webhooks,
 * provider order acceptance, active calls.
 *
 * A route opts into shedding with `@ShedOnOverload()`. Without it, the guard
 * passes through (fail-closed to serving). The load signal is injectable so
 * tests pin the contract without saturating a real loop.
 *
 * Clients honor Retry-After (15.1 patient-app/web/provider/admin clients).
 * The k6 proof (checkout p95 < 1s while low-priority sheds under stress) needs
 * staging and is BLOCKED here; the guard + unit contract ship now.
 */
export const SHED_ON_OVERLOAD_KEY = 'nabd_shed_on_overload';
export function ShedOnOverload(): MethodDecorator & ClassDecorator {
  return SetMetadata(SHED_ON_OVERLOAD_KEY, true);
}

export interface LoadSignal {
  /** Mean event-loop delay in ms over the last few seconds. */
  eventLoopDelayMs(): number;
  /** Heap used as a share (0..1) of the V8 heap limit. */
  heapUsedRatio(): number;
}

const DEFAULT_OVERLOAD = {
  /** Shed when the loop lags past 250ms mean — requests are already timing out. */
  maxEventLoopDelayMs: 250,
  /** Shed when the heap passes 85% — before GC thrash takes the process down. */
  maxHeapUsedRatio: 0.85,
  /** Tell shed clients when to come back. */
  retryAfterSeconds: 5,
};

/** Window after which the event-loop histogram starts over, so the mean tracks current load. */
const LOOP_WINDOW_MS = 5_000;

function realLoadSignal(): LoadSignal {
  let histogram: ReturnType<typeof monitorEventLoopDelay> | undefined;
  let windowStart = Date.now();
  let lastMeanMs = 0;
  try {
    histogram = monitorEventLoopDelay({ resolution: 20 });
    histogram.enable();
  } catch {
    histogram = undefined;
  }
  return {
    eventLoopDelayMs: () => {
      if (!histogram) return 0;
      // The histogram accumulates from enable(); without a reset its mean is the average
      // since boot and barely moves under a fresh overload (or stays high long after one).
      if (Date.now() - windowStart >= LOOP_WINDOW_MS) {
        lastMeanMs = Number.isFinite(histogram.mean) ? histogram.mean / 1e6 : 0;
        histogram.reset();
        windowStart = Date.now();
      }
      const current = Number.isFinite(histogram.mean) ? histogram.mean / 1e6 : 0;
      return Math.max(current, lastMeanMs);
    },
    heapUsedRatio: () => {
      // heapUsed/heapTotal is not memory pressure: V8 grows heapTotal lazily, so that ratio sits
      // near 0.9 on a healthy process. The ceiling that matters is the heap size limit.
      const limit = getHeapStatistics().heap_size_limit;
      return limit > 0 ? process.memoryUsage().heapUsed / limit : 0;
    },
  };
}

@Injectable()
export class LoadSheddingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    // Optional so Nest DI can instantiate the guard globally: unprovided params
    // arrive as undefined and the defaults below apply. Tests inject mocks directly.
    @Optional() private readonly signal: LoadSignal = realLoadSignal(),
    @Optional() private readonly limits: typeof DEFAULT_OVERLOAD = DEFAULT_OVERLOAD,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const sheddable =
      this.reflector.get<boolean>(SHED_ON_OVERLOAD_KEY, context.getHandler()) ??
      this.reflector.get<boolean>(SHED_ON_OVERLOAD_KEY, context.getClass()) ??
      false;
    // Not marked sheddable → always serve. Critical routes are NEVER marked,
    // so they can never be shed no matter how deep the overload.
    if (!sheddable) return true;

    const overloaded =
      this.signal.eventLoopDelayMs() > this.limits.maxEventLoopDelayMs ||
      this.signal.heapUsedRatio() > this.limits.maxHeapUsedRatio;
    if (!overloaded) return true;

    const res = context.switchToHttp().getResponse();
    try {
      res.setHeader?.('Retry-After', String(this.limits.retryAfterSeconds));
    } catch {
      /* non-HTTP */
    }
    throw new ServiceUnavailableException('server_shedding_load');
  }
}
