import { toHalalas } from '../../common/money';
import type { Finding } from './ledger-invariants';

/** R11: one day of Moyasar payments against our records. Amounts are compared in halalas (Moyasar sends integers; ours are SAR doubles). Pure. */
export interface GatewayPayment { id: string; status: string; amount: number; refunded?: number; created_at?: string }
export interface LocalPayment { source: 'transactions' | 'moyasar_payments'; id: string; gateway_ids: string[]; status: string; amount: number; refunded_amount?: number; amount_halalas?: number; refunded_amount_halalas?: number; paid_at?: Date | string }

const GATEWAY_PAID = new Set(['paid', 'captured', 'refunded', 'partially_refunded']);
const LOCAL_PAID = new Set(['paid', 'refunded', 'partially_refunded']);

function localHalalas(x: unknown): number { try { return toHalalas(Number(x) || 0); } catch { return NaN; } }
/** R11 P2: the integer shadow wins when the row has one (no conversion, no rounding); the double is the fallback for rows the backfill has not reached. */
function amountOf(l: LocalPayment): number { return Number.isSafeInteger(l.amount_halalas) ? (l.amount_halalas as number) : localHalalas(l.amount); }
function refundedOf(l: LocalPayment): number { return Number.isSafeInteger(l.refunded_amount_halalas) ? (l.refunded_amount_halalas as number) : localHalalas(l.refunded_amount); }

export function reconcileDay(gateway: GatewayPayment[], local: LocalPayment[]): Finding[] {
  const out: Finding[] = [];
  const byGatewayId = new Map<string, LocalPayment>();
  for (const l of local) for (const g of l.gateway_ids) if (g) byGatewayId.set(g, l);
  const seenLocal = new Set<LocalPayment>();

  for (const g of gateway) {
    const l = byGatewayId.get(g.id);
    if (!l) {
      if (GATEWAY_PAID.has(g.status)) out.push({ code: 'gateway_paid_not_recorded', entity_id: g.id, detail: { status: g.status, amount_halalas: g.amount } });
      continue;
    }
    seenLocal.add(l);
    const gPaid = GATEWAY_PAID.has(g.status);
    const lPaid = LOCAL_PAID.has(l.status);
    if (gPaid !== lPaid) { out.push({ code: 'status_mismatch', entity_id: g.id, detail: { gateway: g.status, local: l.status, local_id: l.id, source: l.source } }); continue; }
    if (!gPaid) continue;
    if (g.amount !== amountOf(l)) out.push({ code: 'amount_mismatch', entity_id: g.id, detail: { gateway_halalas: g.amount, local_halalas: amountOf(l), local_id: l.id, source: l.source } });
    const gRef = Number(g.refunded || 0);
    if (gRef !== refundedOf(l)) out.push({ code: 'refund_mismatch', entity_id: g.id, detail: { gateway_refunded_halalas: gRef, local_refunded_halalas: refundedOf(l), local_id: l.id, source: l.source } });
  }
  // we think it was paid in this window, the gateway does not list it at all (sandbox ids never reach the gateway and are excluded by the caller)
  for (const l of local) {
    if (seenLocal.has(l) || !LOCAL_PAID.has(l.status)) continue;
    out.push({ code: 'recorded_paid_not_at_gateway', entity_id: l.id, detail: { source: l.source, amount_halalas: amountOf(l), gateway_ids: l.gateway_ids } });
  }
  return out;
}
