/** Ord11: GET /ordering/bookings/:id/results parsed as is: each value with the unit, the lab's reference range and the server's flag. */
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export type ResultValue = { catalogId: string; name: string; value: number; unit: string; low: number | null; high: number | null; flag: "normal" | "low" | "high"; trend: Array<{ date: string; value: number }> };

export function parseResultValues(payload: unknown): ResultValue[] {
  const r = obj(payload);
  const root = r && obj(r.data) && !Array.isArray(r.values) ? obj(r.data) : r;
  return (Array.isArray(root?.values) ? (root?.values as unknown[]) : []).flatMap((v): ResultValue[] => {
    const o = obj(v);
    const value = o && num(o.value);
    if (!o || typeof o.catalog_id !== "string" || value === null) return [];
    const range = obj(o.range);
    return [{
      catalogId: o.catalog_id, name: typeof o.name === "string" && o.name ? o.name : o.catalog_id, value, unit: typeof o.unit === "string" ? o.unit : "",
      trend: (Array.isArray(o.trend) ? o.trend : []).flatMap((t): Array<{ date: string; value: number }> => { const x = obj(t); const n = x && num(x.value); return x && typeof x.date === "string" && n !== null ? [{ date: x.date, value: n }] : []; }),
      low: range ? num(range.low) : null, high: range ? num(range.high) : null, flag: o.flag === "low" || o.flag === "high" ? o.flag : "normal",
    }];
  });
}

/** Where a value sits on its bar: the reference band is the middle half of the track, the ends are the same span again on each side. */
export function rangeGeometry(r: Pick<ResultValue, "value" | "low" | "high">): { band: [number, number]; marker: number } | null {
  if (r.low === null || r.high === null || r.high <= r.low) return null;
  const span = r.high - r.low;
  const min = r.low - span * 0.5;
  const max = r.high + span * 0.5;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  return { band: [pct(r.low), pct(r.high)], marker: pct(r.value) };
}
