/**
 * Money step M3: the shadow fields of a raw `moyasar_payments` refund write. The payment row's OWN currency decides them (never the
 * market of the person pressing the button): `_halalas` only when it is the Saudi currency, `_minor` + `currency` always.
 */
import { shadowFields } from '../../common/halala-shadow';
import { minorFields, resolveWriteCurrency } from '../../common/minor-shadow';
import { DEFAULT_CURRENCY } from '../../common/market-defaults';

export function refundedShadows(paidCurrency: unknown, refundedAmount: number): Record<string, unknown> {
  const cur = resolveWriteCurrency(paidCurrency);
  return {
    ...(cur === DEFAULT_CURRENCY ? shadowFields({ refunded_amount: refundedAmount }, ['refunded_amount']) : {}),
    ...minorFields({ refunded_amount: refundedAmount }, ['refunded_amount'], cur),
  };
}
