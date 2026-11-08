import { Logger } from '@nestjs/common';
import { registerGauge } from './metrics.service';
import { LoadSignal, sharedLoadSignal } from './load-shedding.guard';
import type { KillswitchFeature } from './killswitches/killswitches.helper';

/**
 * R16: ONE answer to "how overloaded is this process right now", used by admission control, shedding and the degrade-gracefully flags.
 *   level 0  healthy
 *   level 1  strained: event-loop lag > 150 ms, or heap > 80 % of its limit, or the low-priority share of in-flight requests is >= 90 % full
 *   level 2  overloaded: event-loop lag > 250 ms or heap > 85 % (the thresholds the existing LoadSheddingGuard always used)
 * Escalates at once, de-escalates only after CALM_MS without the higher level (hysteresis: no flapping at the edge). Evaluated at most every 500 ms (hot path).
 */
export type OverloadLevel = 0 | 1 | 2;
export const OVERLOAD = { loop1: 150, loop2: 250, heap1: 0.8, heap2: 0.85, fill1: 0.9, calmMs: 30_000, evalMs: 500 };

export class OverloadGovernor {
  private cur: OverloadLevel = 0;
  private lastHigh = 0;
  private lastEval = -Infinity;
  constructor(
    private readonly signal: LoadSignal = sharedLoadSignal(),
    private readonly now: () => number = Date.now,
    private readonly lowFill: () => number = () => 0,
    /** Called on every change of level (not per request) with the readings that caused it; the process-wide governor logs it. */
    private readonly onChange?: (from: OverloadLevel, to: OverloadLevel, why: { loopMs: number; heapRatio: number; lowFill: number }) => void,
  ) {}

  level(): OverloadLevel {
    const t = this.now();
    if (t - this.lastEval < OVERLOAD.evalMs) return this.cur;
    this.lastEval = t;
    const loop = this.signal.eventLoopDelayMs(); const heap = this.signal.heapUsedRatio(); const fill = this.lowFill();
    const raw: OverloadLevel = loop > OVERLOAD.loop2 || heap > OVERLOAD.heap2 ? 2 : loop > OVERLOAD.loop1 || heap > OVERLOAD.heap1 || fill >= OVERLOAD.fill1 ? 1 : 0;
    const before = this.cur;
    if (raw >= this.cur) { this.cur = raw; this.lastHigh = t; }
    else if (t - this.lastHigh >= OVERLOAD.calmMs) { this.cur = raw; this.lastHigh = t; }
    if (this.cur !== before) this.onChange?.(before, this.cur, { loopMs: loop, heapRatio: heap, lowFill: fill });
    return this.cur;
  }
}

// ── the process-wide governor, fed by the admission middleware's low-priority fill ratio ──────────────────────────────────────────────────────────────
let fillReader: () => number = () => 0;
export function setLowPriorityFill(read: () => number) { fillReader = read; }
let governor: OverloadGovernor | undefined;
const overloadLog = new Logger('Overload');
/** Why the level changed, in one line (2026-11-08: the live gate answered 503 server_shedding_load and nothing in the log said which signal fired). */
export function describeLevelChange(from: OverloadLevel, to: OverloadLevel, why: { loopMs: number; heapRatio: number; lowFill: number }): string {
  return `overload level ${from} -> ${to}: event-loop mean ${Math.round(why.loopMs)} ms (level 1 above ${OVERLOAD.loop1}, level 2 above ${OVERLOAD.loop2}), heap ${(why.heapRatio * 100).toFixed(0)} % of its limit (above ${OVERLOAD.heap1 * 100} / ${OVERLOAD.heap2 * 100}), low-priority in-flight ${(why.lowFill * 100).toFixed(0)} % (level 1 at ${OVERLOAD.fill1 * 100})`;
}
export function overload(): OverloadGovernor {
  return (governor ??= new OverloadGovernor(sharedLoadSignal(), Date.now, () => fillReader(), (from, to, why) => overloadLog.warn(describeLevelChange(from, to, why))));
}
export function resetOverloadForTests(g?: OverloadGovernor) { governor = g; }
registerGauge('nabd_overload_level', '0 healthy, 1 strained (non-critical features degrade), 2 overloaded (low-priority routes are shed).', () => overload().level());

/** Features that switch off by themselves at each level, on top of the admin-controlled kill switches. Critical paths (payment, booking, auth, calls) are never on this list. */
export const AUTO_DEGRADE: Record<1 | 2, KillswitchFeature[]> = {
  1: ['recommendations', 'nudges', 'analyticsIngestion', 'searchSuggestions'],
  2: ['recommendations', 'nudges', 'analyticsIngestion', 'searchSuggestions', 'liveMap', 'ai'],
};
export function autoDegraded(feature: string, level: OverloadLevel = overload().level()): boolean {
  return level > 0 && (AUTO_DEGRADE[level] as string[]).includes(feature);
}
