/**
 * One quote shape for every booking kind. The server states every amount (lines, VAT, discount, total); the clients only display it.
 * Prices are VAT-inclusive (the invoice takes VAT out of the total the same way), so `total` is what the patient is charged and
 * `subtotal + vat = total`.
 */
export interface QuoteLine {
  /** Stable key the clients translate: consultation_fee, platform_fee, home_visit_fee, transport_fee, service, sessions ... */
  key: string;
  amount: number;
  qty?: number;
  unit_price?: number;
}

export interface Quote {
  kind: string;
  currency: 'SAR';
  lines: QuoteLine[];
  discount: number;
  subtotal: number;
  vat_rate: number;
  vat: number;
  total: number;
  allowed_methods: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export const DEFAULT_VAT_RATE = 0.15;

/** The VAT rate of `finance_config.tax.vat_percent` (the one the settlement and the invoice use), 15% when none is set. */
export async function readVatRate(conn: { collection(name: string): any }): Promise<number> {
  let cfg: any = null;
  try { cfg = await conn.collection('finance_config').findOne({ key: 'commissions' }); } catch { /* no config store: the default rate */ }
  const pct = Number(cfg?.tax?.vat_percent);
  return Number.isFinite(pct) && pct >= 0 && pct <= 50 ? pct / 100 : DEFAULT_VAT_RATE;
}

export function buildQuote(input: { kind: string; lines: QuoteLine[]; vat_rate: number; discount?: number; allowed_methods: readonly string[] }): Quote {
  const lines = input.lines.map((l) => ({ ...l, amount: round2(l.amount) }));
  const discount = round2(Math.max(0, input.discount ?? 0));
  const total = round2(Math.max(0, lines.reduce((s, l) => s + l.amount, 0) - discount));
  const vat = round2(total - total / (1 + input.vat_rate));
  return {
    kind: input.kind, currency: 'SAR', lines, discount,
    subtotal: round2(total - vat), vat_rate: input.vat_rate, vat, total,
    allowed_methods: [...input.allowed_methods],
  };
}
