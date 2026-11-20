/**
 * The ONE table of ISO 4217 minor-unit digits (blueprint section 5, money): SAR/EGP/AED/USD/EUR 2, JOD/BHD/KWD/OMR 3, JPY 0. The market configuration validator and the money helpers
 * (`common/money-minor.ts`) both read it, so a currency is added in exactly one place and an unknown code is refused until it is. No amount is converted between currencies (v1: a market has one currency).
 */
export const CURRENCY_EXPONENTS: Readonly<Record<string, number>> = {
  SAR: 2, EGP: 2, AED: 2, USD: 2, EUR: 2, JOD: 3, BHD: 3, KWD: 3, OMR: 3, JPY: 0,
};

export function isKnownCurrency(code: unknown): code is string {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(CURRENCY_EXPONENTS, code);
}

/** Minor-unit digits of a currency; throws for a code that is not in the table (never guesses 2). */
export function currencyExponent(code: string): number {
  if (!isKnownCurrency(code)) throw new Error(`unknown_currency: ${String(code)}`);
  return CURRENCY_EXPONENTS[code];
}
