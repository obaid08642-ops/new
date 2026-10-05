// Q5: commission ledger rows for /admin/financial-ledger.
// GET /admin/finance/ledger/commissions (backend web-core finance.controller.ts,
// R36 path) returns { data: CommissionLedger[] } with the amounts the ledger
// stored (commission-ledger.schema.ts). The page shows those stored amounts;
// it never recomputes them with client-side rates.

export const COMMISSIONS_LEDGER_PATH = '/api/admin/admin/finance/ledger/commissions';

export type CommissionLedgerRow = {
  id: string;
  providerName: string;
  providerType: string;
  baseBill: number;
  systemCommission: number;
  vatOnCommission: number;
  providerEarning: number;
};

export type CommissionLedgerState = { status: 'ready' | 'empty' | 'error'; rows: CommissionLedgerRow[] };

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function parseCommissionLedger(payload: unknown): CommissionLedgerRow[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : [];
  const rows: CommissionLedgerRow[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const r = raw as Record<string, unknown>;
    const id = str(r._id) ?? str(r.id);
    const providerName = str(r.providerName);
    const providerType = str(r.providerType);
    const baseBill = num(r.baseBill);
    const systemCommission = num(r.systemCommission);
    const vatOnCommission = num(r.vatOnCommission);
    const providerEarning = num(r.providerEarning);
    if (!id || !providerName || !providerType || baseBill === null || systemCommission === null || vatOnCommission === null || providerEarning === null) continue;
    rows.push({ id, providerName, providerType, baseBill, systemCommission, vatOnCommission, providerEarning });
  }
  return rows;
}

/** The commission rate the ledger applied, in percent (null when the base bill is zero). */
export function commissionRate(row: Pick<CommissionLedgerRow, 'baseBill' | 'systemCommission'>): number | null {
  if (!row.baseBill) return null;
  return Math.round((row.systemCommission / row.baseBill) * 10000) / 100;
}

export async function loadCommissionLedger(fetcher: (url: string) => Promise<Response>): Promise<CommissionLedgerState> {
  try {
    const res = await fetcher(COMMISSIONS_LEDGER_PATH);
    if (!res.ok) return { status: 'error', rows: [] };
    const rows = parseCommissionLedger(await res.json().catch(() => null));
    return { status: rows.length ? 'ready' : 'empty', rows };
  } catch {
    return { status: 'error', rows: [] };
  }
}
