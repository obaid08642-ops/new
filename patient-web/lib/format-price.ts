/**
 * Prices and numbers for the pharmacy screens, through the locale's own formatter (owner rule 2026-10-06): never a
 * hand-built "24.50 SAR". The API's prices are Saudi riyals (`currency` is always SAR on the public catalogue).
 * The amount and the currency come apart because the design's cards draw them in two sizes (canvas/PharmacyHub).
 *
 * Urdu (owner, 2026-10-10, issue 1093): Intl writes the riyal as the code "SAR" in Urdu, so Urdu uses the symbol "ر.س"
 * after the amount, like Arabic and like the Urdu strings of the message files. Every other language is unchanged.
 */
export const URDU_RIYAL_SYMBOL = "ر.س";

const isUrdu = (locale: string) => locale === "ur" || locale.startsWith("ur-");

export function formatPrice(locale: string, value: number): { amount: string; currency: string; text: string } {
  if (isUrdu(locale)) {
    const amount = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    return { amount, currency: URDU_RIYAL_SYMBOL, text: `${amount} ${URDU_RIYAL_SYMBOL}` };
  }
  const nf = new Intl.NumberFormat(locale, { style: "currency", currency: "SAR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parts = nf.formatToParts(value);
  const amount = parts.filter((p) => p.type !== "currency" && p.type !== "literal").map((p) => p.value).join("");
  const currency = parts.filter((p) => p.type === "currency").map((p) => p.value).join("").trim();
  return { amount, currency, text: nf.format(value) };
}

export function formatNumber(locale: string, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}
