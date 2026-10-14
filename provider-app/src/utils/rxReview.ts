/** A doctor-typed prescription line as the pharmacy sees it (GET /prescriptions/pharmacy/queue and /prescriptions/manual-review/queue). */
export interface RxItem {
  index: number;
  name: string;
  dose: string;
  manualPending: boolean;
  substituted: boolean;
}

export interface RxRow {
  id: string;
  state: string;
  items: RxItem[];
  /** Lines the pharmacy must replace with an approved medicine before the prescription can be dispensed. */
  pendingManual: number;
  verified: boolean;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function toRxRow(raw: unknown, ar: boolean): RxRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string') return null;
  const list: unknown[] = Array.isArray(r.items) ? r.items : [];
  const items = list.map((it, index): RxItem => {
    const o = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>;
    const nameAr = str(o.medicine_name_ar);
    const nameEn = str(o.medicine_name_en);
    return {
      index,
      name: (ar ? nameAr || nameEn : nameEn || nameAr) || '—',
      dose: str(o.dose),
      manualPending: o.manual_review_status === 'PENDING_REVIEW',
      substituted: o.substituted === true,
    };
  });
  return {
    id: r.id,
    state: str(r.state),
    items,
    pendingManual: items.filter(i => i.manualPending).length,
    verified: typeof r.verified_by === 'string' && r.verified_by.length > 0,
  };
}

/** The same prescription can come from both queues: keep the first row of each id. */
export function mergeRxRows(...lists: RxRow[][]): RxRow[] {
  const seen = new Set<string>();
  const out: RxRow[] = [];
  for (const l of lists) for (const r of l) { if (!seen.has(r.id)) { seen.add(r.id); out.push(r); } }
  return out;
}
