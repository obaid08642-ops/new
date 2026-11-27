/**
 * Money step M6: the pharmacy settlement arithmetic in the allocation's OWN currency (`allocation.totals.currency`, absent = the default currency).
 * For the default (Saudi) currency every function is EXACTLY the expression the service had before (`Math.round(x * 100) / 100`, `Math.round(gross * pct) / 100`):
 * SA output is byte-identical. For any other currency the exponent of that currency is used, so a 3-digit currency is settled to the fils, not to 2 digits.
 */
import { DEFAULT_CURRENCY } from '../../common/market-defaults';
import { currencyExponent } from '../../common/currency';
import { roundToCurrency } from '../../common/money-minor';

/** The currency of an allocation: its quote's own, else the default. */
export const pharmacyCurrency = (a: any): string => String(a?.totals?.currency || DEFAULT_CURRENCY);

/** `Math.round(x * 100) / 100` for the default currency (unchanged); the currency's own minor unit otherwise. */
export function roundAmount(x: number, currency: string): number {
  if (currency === DEFAULT_CURRENCY) return Math.round(x * 100) / 100;
  const f = 10 ** currencyExponent(currency);
  return Math.round(x * f) / f;
}

export interface Settlement { commission: number; vat: number; net: number; codOwed: number }

/**
 * Commission, VAT on it, the pharmacy's net, and what a cash-collecting pharmacy owes the platform (commission + VAT + the platform's delivery fee),
 * from the pharmacy gross, the commission percent and the VAT percent.
 */
export function settlementAmounts(gross: number, platformDeliveryFee: number, pct: number, vatPct: number, currency: string): Settlement {
  if (currency === DEFAULT_CURRENCY) {
    const commission = Math.round(gross * pct) / 100;
    const vat = Math.round(commission * vatPct) / 100;
    return { commission, vat, net: Math.round((gross - commission - vat) * 100) / 100, codOwed: Math.round((commission + vat + platformDeliveryFee) * 100) / 100 };
  }
  const f = 10 ** currencyExponent(currency);
  const per = f / 100;                                       // the percent is of a hundred: the minor unit of this currency per 1 percent point of a major unit
  const commission = Math.round(gross * pct * per) / f;
  const vat = Math.round(commission * vatPct * per) / f;
  return { commission, vat, net: roundToCurrency(gross - commission - vat, currency), codOwed: roundToCurrency(commission + vat + platformDeliveryFee, currency) };
}
