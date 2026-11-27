import { isCleanSar, sumHalalas, toHalalas } from '../../common/money';
import { isCleanAmount, toMinor } from '../../common/money-minor';
import { DEFAULT_CURRENCY } from '../../common/market-defaults';

/**
 * R11: invariants of the platform ledger (`platformledgerentries`) for ONE order, computed on integer halalas. Pure: the service loads the rows.
 * Semantics (finance-engine.module.ts): a `provider_earning` row carries `amount` (provider net), `gross`, `commission`, `vat`; a refund adds a `refund` row
 * (what the patient got back) and, in proportion to the refunded share of what the patient paid, a `provider_debit` (clawback of the net),
 * a `commission_reversal` and a `vat_reversal`, all with ref_type 'refund' and the refund id as ref_id.
 */
export interface LedgerRow { id?: string; type: string; amount: number; ref_type?: string; ref_id?: string; gross?: number; commission?: number; vat?: number; state?: string }
export interface PaymentRow { currency?: string; amount_minor?: number; refunded_amount_minor?: number; amount: number; refunded_amount?: number; amount_halalas?: number; refunded_amount_halalas?: number; status?: string; kind: 'transaction' | 'moyasar_payment'; id?: string; method?: string }
export interface OrderContext { order_id: string; ledger: LedgerRow[]; earnings: LedgerRow[]; payments: PaymentRow[] }
export interface Finding { code: string; entity_id: string; detail: Record<string, unknown> }

const PAID = new Set(['paid', 'partially_refunded', 'refunded']);
const IDEMPOTENT_TYPES = new Set(['refund', 'provider_debit', 'commission_reversal', 'vat_reversal', 'provider_earning']);


export function checkOrder(ctx: OrderContext): Finding[] {
  const out: Finding[] = [];
  const id = ctx.order_id;
  const add = (code: string, detail: Record<string, unknown>) => out.push({ code, entity_id: id, detail });

  // INV-8 one currency per order (money step M4): the amounts of an order are only ever added up in ONE currency. Payments of two currencies on one order are a
  // finding, and the rest of the checks do not run (they would add unlike units). A row with no currency is in the Saudi currency (written before currencies existed).
  const currencies = [...new Set(ctx.payments.map((p) => p.currency || DEFAULT_CURRENCY))];
  if (currencies.length > 1) { add('order_currency_mismatch', { currencies }); return out; }
  const cur = currencies[0] ?? DEFAULT_CURRENCY;
  // integer minor units of the order's currency; for the Saudi currency this is exactly the halalas of before
  const h = (x: unknown) => { try { return toMinor(Number(x) || 0, cur); } catch { return 0; } };
  const sum = (rows: LedgerRow[], type: string, f: (r: LedgerRow) => number = (r) => h(r.amount)) => sumHalalas(rows.filter((r) => r.type === type).map(f));

  // INV-5 amount hygiene: every money field is a finite, non-negative number with at most 2 decimals
  for (const r of [...ctx.ledger, ...ctx.earnings]) {
    for (const f of ['amount', 'gross', 'commission', 'vat'] as const) {
      const v = (r as any)[f];
      if (v === undefined || v === null) continue;
      if (!isCleanAmount(v, cur) || v < 0) add('ledger_amount_unclean', { ledger_id: r.id, type: r.type, field: f, value: v });
    }
  }
  // INV-7 shadow consistency (R11 P1): a payment row that carries `<field>_halalas` must carry the halalas of its double. A mismatch means a write changed the
  // double without the shadow (a raw collection write that skipped common/halala-shadow.ts). A row with no shadow yet is not a finding: the backfill fills history.
  for (const p of ctx.payments) {
    for (const f of ['amount', 'refunded_amount'] as const) {
      const minor = (p as any)[`${f}_minor`];
      const val = (p as any)[f];
      // INV-9 the `_minor` shadow (money step M3/M4) is the minor units of its double in the row's currency
      if (minor !== undefined && minor !== null && val !== undefined && val !== null && isCleanAmount(val, cur) && minor !== toMinor(val, cur)) add('payment_minor_mismatch', { payment: p.kind, payment_id: p.id, field: f, value: val, shadow: minor, currency: cur });
      if (cur !== DEFAULT_CURRENCY) continue;   // `_halalas` exists for the Saudi currency only
      const shadow = (p as any)[`${f}_halalas`];
      const v = (p as any)[f];
      if (shadow === undefined || shadow === null || v === undefined || v === null || !isCleanSar(v)) continue;
      if (shadow !== toHalalas(v)) add('payment_shadow_mismatch', { payment: p.kind, payment_id: p.id, field: f, value: v, shadow });
    }
  }
  // INV-6 idempotency: one row per (type, ref_type, ref_id) for the types that are written once per business event
  const seen = new Map<string, number>();
  for (const r of ctx.ledger) {
    if (!IDEMPOTENT_TYPES.has(r.type) || !r.ref_id) continue;
    const k = `${r.type}|${r.ref_type}|${r.ref_id}`;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const [k, n] of seen) if (n > 1) add('ledger_duplicate_row', { key: k, rows: n });

  const refunds = ctx.ledger.filter((r) => r.type === 'refund');
  const refundedH = sum(ctx.ledger, 'refund');
  const paidPayments = ctx.payments.filter((p) => PAID.has(String(p.status)) && p.method !== 'cash');
  const paidH = sumHalalas(paidPayments.map((p) => h(p.amount)));

  // INV-1 never refund more than was paid (card payments only: cash has no payment row)
  if (paidPayments.length && refundedH > paidH) add('refund_exceeds_paid', { paid: paidH, refunded: refundedH });

  // INV-2 the ledger's refunds equal what the payment records say was refunded
  if (paidPayments.length) {
    const recordedH = sumHalalas(paidPayments.map((p) => h(p.refunded_amount)));
    const gatewayRefundsH = sumHalalas(refunds.filter((r) => (r as any).meta?.method === 'gateway').map((r) => h(r.amount)));
    if (recordedH !== gatewayRefundsH) add('refund_ledger_vs_payment', { payment_refunded: recordedH, ledger_gateway_refunds: gatewayRefundsH });
  }

  // INV-3 reversals never exceed the earning they reverse
  for (const e of ctx.earnings) {
    const debit = sum(ctx.ledger, 'provider_debit', (r) => (r.ref_type === 'refund' && r.ref_id && !String(r.ref_id).startsWith('appt-penalty-') ? h(r.amount) : 0));
    const netH = h(e.amount);
    if (debit > netH) add('clawback_exceeds_earning', { earning_id: e.id, earning: netH, clawed_back: debit });
    const cr = sum(ctx.ledger, 'commission_reversal'); const vr = sum(ctx.ledger, 'vat_reversal');
    if (cr > h(e.commission)) add('commission_reversal_exceeds', { earning_id: e.id, commission: h(e.commission), reversed: cr });
    if (vr > h(e.vat)) add('vat_reversal_exceeds', { earning_id: e.id, vat: h(e.vat), reversed: vr });

    // INV-4 what the provider keeps is proportional to what the patient did NOT get back: debit ~ net * min(1, refunded / paid), one halala of rounding per refund
    if (paidH > 0 && refundedH > 0 && ctx.earnings.length === 1) {
      const expected = Math.min(netH, Math.round((netH * Math.min(refundedH, paidH)) / paidH));
      const tolerance = refunds.length + 1;
      if (Math.abs(debit - expected) > tolerance) add('clawback_not_proportional', { earning: netH, paid: paidH, refunded: refundedH, clawed_back: debit, expected, tolerance });
    }
  }
  return out;
}
