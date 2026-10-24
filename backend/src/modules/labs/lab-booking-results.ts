/**
 * Design parity (#1819): the booking detail's `results[]`: the values the lab typed into the booking's result documents,
 * one row per value, so the patient screen draws them without a second call. Primitive fields only (the lab types the
 * entries free-form), nothing computed here: the flag is the one the lab or the server stored.
 */
export interface LabResultRow {
  result_id: string | null;
  name: string;
  value: string | number | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  range: string | null;
  flag: string | null;
  reported_at: string | null;
  critical: boolean;
}

const str = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function flattenResultEntries(docs: any[], max = 200): LabResultRow[] {
  const out: LabResultRow[] = [];
  for (const doc of Array.isArray(docs) ? docs : []) {
    const reportedAt = doc?.reported_at ? new Date(doc.reported_at).toISOString() : null;
    for (const e of Array.isArray(doc?.entries) ? doc.entries : []) {
      const name = str(e?.name);
      if (!name) continue;
      out.push({
        result_id: str(doc?.id, 80),
        name,
        value: typeof e?.value === 'number' && Number.isFinite(e.value) ? e.value : str(e?.value, 80),
        unit: str(e?.unit, 40),
        ref_low: num(e?.ref_low),
        ref_high: num(e?.ref_high),
        range: str(e?.range, 80),
        flag: str(e?.flag, 20),
        reported_at: reportedAt,
        critical: doc?.critical === true,
      });
      if (out.length >= max) return out;
    }
  }
  return out;
}
