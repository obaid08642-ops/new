/**
 * F3 (15.6 follow-up) — malformed `?page=` / `?limit=` must never reach the
 * driver as NaN. `parseInt('abc')` is NaN (not 0, not the default), and
 * `Math.max(NaN, 1)` stays NaN, so a bare `parseInt` at a controller hands
 * `skip(NaN)` / `limit(NaN)` / `$limit: NaN` to Mongo — a 500-class failure.
 *
 * `queryInt` coerces with an explicit `Number.isFinite` check (same guard the
 * 15.6 list path and `paginate()`/`cursorPage()` already use at the service
 * layer), so every controller passes only finite integers downstream.
 */
export function queryInt(raw: string | undefined, def: number): number {
  if (raw === undefined) return def;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : def;
}
