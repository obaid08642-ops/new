/**
 * POST /ai/scan (decision 36, the AI scanner): the server reads one photo with the vision model and answers either
 * `{ kind: "pack" | "barcode" | "qr", reading: { name }, matches: [catalogue cards] }` (the closest public-catalogue
 * medicines, ranked) or `{ kind: "prescription", status: "saved" | "unreadable", prescription_id }` (the photo went
 * through the normal prescription flow). Only the fields the screen draws are kept.
 */
export type ScanMedicine = { id: string; slug?: string; name: string; meta: string; price?: number; requiresRx: boolean; onlineOnly: boolean };
export type ScanOutcome =
  | { kind: "matches"; readAs: string | null; medicines: ScanMedicine[] }
  | { kind: "prescription"; prescriptionId: string }
  | { kind: "prescriptionUnreadable" };

type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null);
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

/** The card's name in the page's language: Arabic, English, or the catalogue's translation (fil is stored as tl). */
function localName(medicine: Row, locale: string): string | undefined {
  if (locale === "ar") return text(medicine.name_ar) ?? text(medicine.name_en);
  const translations = row(medicine.translations);
  const translated = locale === "en" ? undefined : text(row(translations?.[locale === "fil" ? "tl" : locale])?.name);
  return translated ?? text(medicine.name_en) ?? text(medicine.name_ar);
}

export function parseScanAnswer(payload: unknown, locale: string): ScanOutcome | null {
  const root = row(payload);
  if (!root) return null;
  if (root.kind === "prescription") {
    const id = text(root.prescription_id);
    return root.status === "saved" && id ? { kind: "prescription", prescriptionId: id } : { kind: "prescriptionUnreadable" };
  }
  if (!["pack", "barcode", "qr"].includes(String(root.kind))) return null;
  const medicines: ScanMedicine[] = [];
  for (const item of Array.isArray(root.matches) ? root.matches : []) {
    const medicine = row(item);
    const id = text(medicine?.id);
    const name = medicine ? localName(medicine, locale) : undefined;
    if (!medicine || !id || !name) continue;
    const price = typeof medicine.price === "number" && Number.isFinite(medicine.price) && medicine.price > 0 ? medicine.price : undefined;
    medicines.push({
      id,
      slug: text(medicine.slug),
      name,
      meta: [text(medicine.form), text(medicine.strength), text(medicine.manufacturer)].filter(Boolean).join(" · "),
      price,
      requiresRx: medicine.requires_prescription === true,
      onlineOnly: medicine.online_exclusive === true,
    });
  }
  return { kind: "matches", readAs: text(row(root.reading)?.name) ?? null, medicines };
}
