/**
 * Money as `{ amount_minor, currency }` (blueprint section 5): an integer count of the currency's minor units (SAR/EGP 2 digits, BHD/KWD/OMR 3, JPY 0) next to its ISO 4217 code. It generalises
 * `common/money.ts` (SAR halalas): the arithmetic that does not depend on the unit (`sumHalalas`, `rateOf`, `percentOf`, `allocate`, the safe-integer rule) is REUSED on minor units, so for SAR every result is
 * the same code with the same numbers; only the decimal conversion (`toMinor`, `fromMinor`, `formatMoney`) takes the exponent from the table in `common/currency.ts`.
 * Currencies are never mixed: adding two amounts of different currencies throws `currency_mismatch`. There is no conversion between currencies (v1: a market has one currency).
 */
import { currencyExponent } from './currency';
import { MoneyError, allocate, assertHalalas, percentOf, rateOf, roundSar, sumHalalas } from './money';
import { DEFAULT_CURRENCY } from './market-defaults';

export interface Money { amount_minor: number; currency: string }

const MAX = Number.MAX_SAFE_INTEGER;
const pow10 = (e: number): bigint => 10n ** BigInt(e);
const exp = (currency: string): number => { try { return currencyExponent(currency); } catch (e: any) { throw new MoneyError(e?.message || 'unknown_currency'); } };

/** Builds a Money value: `amountMinor` must be a safe integer, `currency` a known ISO code. */
export function money(amountMinor: number, currency: string): Money {
  exp(currency);
  assertHalalas(amountMinor, 'amount_minor');
  return { amount_minor: amountMinor + 0, currency };
}

/** A decimal amount (number or text, in whole units of the currency) to minor units; rounds half away from zero on the digit after the exponent, decided on the decimal text (never on a binary double). */
export function toMinor(amount: number | string, currency: string): number {
  const e = exp(currency);
  let text: string;
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount)) throw new MoneyError(`not a finite amount: ${amount}`);
    text = amount.toFixed(8);         // 8 decimals hide binary noise (1.005 prints 1.00500000)
  } else {
    text = amount.trim();
  }
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!m) throw new MoneyError(`not a decimal amount: ${String(amount)}`);
  const frac = (m[3] ?? '').padEnd(e + 1, '0');
  let v = BigInt(m[2]) * pow10(e) + BigInt(frac.slice(0, e) || '0');
  if (frac.charCodeAt(e) >= 53) v += 1n;   // the digit after the exponent is >= 5
  if (m[1] === '-') v = -v;
  if (v > BigInt(MAX) || v < -BigInt(MAX)) throw new MoneyError(`amount out of range: ${String(amount)}`);
  return Number(v) + 0;
}

/** Minor units back to a decimal number of whole units (for the legacy double fields and display only). */
export function fromMinor(amountMinor: number, currency: string): number {
  const e = exp(currency);
  assertHalalas(amountMinor, 'amount_minor');
  return amountMinor / 10 ** e;
}

/** '1234' SAR -> '12.34', '1234' BHD -> '1.234', '-5' BHD -> '-0.005', JPY '123' -> '123'. Exact (no floating point). */
export function formatMoney(amountMinor: number, currency: string): string {
  const e = exp(currency);
  assertHalalas(amountMinor, 'amount_minor');
  const neg = amountMinor < 0;
  const a = Math.abs(amountMinor);
  if (e === 0) return `${neg ? '-' : ''}${a}`;
  const unit = 10 ** e;
  return `${neg ? '-' : ''}${Math.floor(a / unit)}.${String(a % unit).padStart(e, '0')}`;
}

/** True when a legacy double is a whole number of minor units of the currency (no float drift, at most `exponent` decimals). */
export function isCleanAmount(x: unknown, currency: string): boolean {
  if (typeof x !== 'number' || !Number.isFinite(x)) return false;
  try { return fromMinor(toMinor(x, currency), currency) === x; } catch { return false; }
}

function sameCurrency(values: Money[]): string {
  if (!values.length) throw new MoneyError('no amounts to add');
  const c = values[0].currency;
  exp(c);
  for (const v of values) if (v.currency !== c) throw new MoneyError(`currency_mismatch: ${c} and ${v.currency}`);
  return c;
}

/** Sum of amounts of ONE currency; mixing currencies throws `currency_mismatch`. */
export function sumMinor(values: Money[]): Money {
  const c = sameCurrency(values);
  return money(sumHalalas(values.map((v) => v.amount_minor)), c);
}

/** m * numerator / denominator, rounded half away from zero (the same BigInt rule as `rateOf`). */
export function rateOfMinor(m: Money, numerator: number, denominator: number): Money {
  exp(m.currency);
  return money(rateOf(m.amount_minor, numerator, denominator), m.currency);
}

/** A percent with at most 4 decimals of an amount (the same rule as `percentOf`). */
export function percentOfMinor(m: Money, percent: number | string): Money {
  exp(m.currency);
  return money(percentOf(m.amount_minor, percent), m.currency);
}

/** Splits an amount over integer weights (largest remainder): the parts always add up to the total, in the same currency. */
export function allocateMinor(m: Money, weights: number[]): Money[] {
  exp(m.currency);
  return allocate(m.amount_minor, weights).map((p) => money(p, m.currency));
}

/**
 * An amount rounded to the minor unit of `currency`, decided on the decimal text like `toMinor`. For the default (Saudi) currency this is exactly `roundSar`
 * (same fallback for non-finite input); for any other currency the exponent of that currency is used, so a 3-digit currency is never rounded to 2 digits.
 */
export function roundToCurrency(n: number, currency: string): number {
  if (currency === DEFAULT_CURRENCY) return roundSar(n);
  if (!Number.isFinite(n)) return NaN;
  try { return fromMinor(toMinor(n, currency), currency); } catch { const f = 10 ** currencyExponent(currency); return Math.round(n * f) / f; }
}
