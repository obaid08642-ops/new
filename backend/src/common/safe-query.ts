/**
 * 15.6 — malformed query input must never reach the driver as NaN.
 *
 * `parseInt('abc')` is NaN (not 0, not the default), and `Math.max(NaN, 1)`
 * stays NaN, so a bare parseInt at a controller hands `skip(NaN)` /
 * `limit(NaN)` / `$limit: NaN` to Mongo — a 500-class failure, which is
 * exactly what this phase forbids ("the backend never returns 500 for bad
 * input").
 *
 * `queryInt` coerces at the controller edge with an explicit `Number.isFinite`
 * check; `clampPageInt` is the service-layer half, because a value that
 * arrives as NaN also survives `Math.max`/`Math.min` as NaN.
 */

/** Controller edge: `?page=abc` → the documented default. */
export function queryInt(raw: string | undefined, def: number): number {
  if (raw === undefined) return def;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : def;
}

/**
 * The float half of the same guard: `?lat=abc` becomes `undefined` (the
 * geofence is then ignored) rather than NaN, which would poison every
 * distance comparison it feeds.
 */
export function queryNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Service layer: coerce to a finite integer and clamp into range.
 *
 * @param value  the raw value; anything non-finite falls back to `def`
 * @param def    the default for page numbers (1) and the soft cap for limits
 * @param max    the hard cap for limits; omit for values that have no ceiling
 */
export function clampPageInt(value: unknown, def: number, max?: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return def;
  const floored = Math.max(1, Math.floor(n));
  return max === undefined ? floored : Math.min(floored, max);
}