/**
 * Prices and numbers for the pharmacy screens, through the locale's own formatter (owner rule 2026-10-06): never a
 * hand-built "24.50 SAR". The API's prices are Saudi riyals (`currency` is always SAR on the public catalogue).
 * The amount and the currency come apart because the design's cards draw them in two sizes (canvas/PharmacyHub).
 */
export function formatPrice(locale: string, value: number): { amount: string; currency: string; text: string } {
  const nf = new Intl.NumberFormat(locale, { style: "currency", currency: "SAR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parts = nf.formatToParts(value);
  const amount = parts.filter((p) => p.type !== "currency" && p.type !== "literal").map((p) => p.value).join("");
  const currency = parts.filter((p) => p.type === "currency").map((p) => p.value).join("").trim();
  return { amount, currency, text: nf.format(value) };
}

export function formatNumber(locale: string, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}
