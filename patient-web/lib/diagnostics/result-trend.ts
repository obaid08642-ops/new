/**
 * Ord11 trend: the earlier values of one test, from the patient's own results (GET /lab-results/mine, each row with its
 * `entries`). Only numeric values are plotted; the list is oldest first and ends with the result being opened.
 */

type Raw = Record<string, unknown>;

export type TrendPoint = { id: string; at: string; value: number; unit?: string; flag?: string };

const MAX_POINTS = 6;

function rowsOf(payload: unknown): Raw[] {
  if (Array.isArray(payload)) return payload.filter((r): r is Raw => !!r && typeof r === "object");
  const data = (payload as Raw | null)?.data;
  return Array.isArray(data) ? data.filter((r): r is Raw => !!r && typeof r === "object") : [];
}

function numeric(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** The trend of the entry called `name` across the patient's results (at least two points, else none). */
export function trendFor(payload: unknown, name: string): TrendPoint[] {
  const wanted = name.trim().toLowerCase();
  const points: TrendPoint[] = [];
  for (const row of rowsOf(payload)) {
    const id = typeof row.id === "string" ? row.id : undefined;
    const at = [row.reported_at, row.uploaded_at, row.createdAt].find((v): v is string => typeof v === "string" && v.length > 0);
    const entries = Array.isArray(row.entries) ? (row.entries as Raw[]) : [];
    const hit = entries.find((e) => typeof e?.name === "string" && e.name.trim().toLowerCase() === wanted);
    const value = hit ? numeric(hit.value) : undefined;
    if (!id || !at || value === undefined) continue;
    const unit = typeof hit?.unit === "string" && hit.unit.trim() ? hit.unit.trim().slice(0, 16) : undefined;
    const flag = typeof hit?.flag === "string" ? hit.flag : undefined;
    points.push({ id, at, value, unit, flag });
  }
  points.sort((a, b) => a.at.localeCompare(b.at));
  if (points.length < 2) return [];
  return points.slice(-MAX_POINTS);
}
