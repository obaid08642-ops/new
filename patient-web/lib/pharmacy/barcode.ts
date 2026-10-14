/**
 * GET /medicines/by-barcode/:code (backend medicines.service.ts byBarcode) answers
 * `{ found, source: "catalog" | "fuzzy" | "none", medicine }`. `catalog` is an exact barcode match. `fuzzy` is NOT: the
 * backend falls back to a name / active-ingredient text match on whatever was typed, so a screen must not say the
 * barcode was recognised. Only the fields the result card draws are kept.
 */
export type BarcodeMatch = {
  kind: "exact" | "closest";
  medicine: { id: string; slug?: string; name: string; form?: string; strength?: string; manufacturer?: string; price?: number; requiresRx: boolean; onlineOnly: boolean };
};

type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null);
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

/** The barcode as typed: digits, letters and the few separators of the symbologies, at most 64 characters (the proxy's limit). */
export function cleanBarcode(value: string): string {
  return value.replace(/\s+/g, "").slice(0, 64);
}

export function parseBarcodeLookup(payload: unknown, locale: string): BarcodeMatch | null {
  const root = row(payload);
  const medicine = row(root?.medicine);
  if (!root || root.found !== true || !medicine) return null;
  const id = text(medicine.id);
  const name = locale === "ar" ? text(medicine.name_ar) ?? text(medicine.name_en) : text(medicine.name_en) ?? text(medicine.name_ar);
  if (!id || !name) return null;
  const price = typeof medicine.price === "number" && Number.isFinite(medicine.price) && medicine.price > 0 ? medicine.price : undefined;
  return {
    kind: root.source === "catalog" ? "exact" : "closest",
    medicine: {
      id,
      slug: text(medicine.slug),
      name,
      form: text(medicine.form),
      strength: text(medicine.strength),
      manufacturer: text(medicine.manufacturer),
      price,
      requiresRx: medicine.requires_prescription === true,
      onlineOnly: medicine.online_exclusive === true,
    },
  };
}
