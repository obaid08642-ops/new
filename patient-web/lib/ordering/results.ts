/** Ord11: GET /ordering/bookings/:id/results parsed as is: each value with the unit, the lab's reference range and the server's flag. */
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export type ResultValue = { catalogId: string; name: string; value: number; unit: string; low: number | null; high: number | null; flag: "normal" | "low" | "high" };

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
      low: range ? num(range.low) : null, high: range ? num(range.high) : null, flag: o.flag === "low" || o.flag === "high" ? o.flag : "normal",
    }];
  });
}
