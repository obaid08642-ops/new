/**
 * The guaranteed appointment (owner 2026-10-24): a patient kept waiting more than N minutes is credited Nabdat points. The minutes
 * and the points are the server's setting, read from the public config (GET /config, `late_guarantee: { minutes, points }`).
 * Nothing is assumed here: when the setting is absent or not a pair of positive whole numbers the line is not drawn.
 */
export type LateGuarantee = { minutes: number; points: number };

const whole = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null);

export function parseLateGuarantee(config: unknown): LateGuarantee | null {
  const root = config && typeof config === "object" && !Array.isArray(config) ? (config as Record<string, unknown>) : null;
  const raw = root?.late_guarantee;
  const g = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const minutes = whole(g?.minutes);
  const points = whole(g?.points);
  return minutes !== null && points !== null ? { minutes, points } : null;
}
