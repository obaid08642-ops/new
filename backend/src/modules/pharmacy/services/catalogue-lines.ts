import { escapeRegex } from '../../../common/slug.util';

/**
 * provider-journeys 1: a pharmacy answers an order line from the national catalogue when the item is not (yet) in its own
 * inventory. A new pharmacy with an empty inventory could only answer "unavailable" before.
 */

/** The catalogue rows a pharmacy may price: not deleted, matched by name, active ingredient, sku or barcode. */
export function catalogueFilter(q?: string, barcode?: string): Record<string, unknown> | null {
  if (barcode) return { is_deleted: { $ne: true }, barcode: String(barcode) };
  const term = String(q || '').trim();
  if (term.length < 2) return null;
  const rx = { $regex: escapeRegex(term), $options: 'i' };
  const or: Record<string, unknown>[] = [{ name_ar: rx }, { name_en: rx }, { generic_name: rx }, { active_ingredient: rx }];
  if (/^\d+$/.test(term)) or.push({ sku: Number(term) });
  return { is_deleted: { $ne: true }, $or: or };
}

export const CATALOGUE_PROJECTION = { _id: 0, id: 1, sku: 1, barcode: 1, name_ar: 1, name_en: 1, generic_name: 1, active_ingredient: 1, form: 1, strength: 1, package_size: 1, price: 1, sfda_price: 1, requires_prescription: 1 };

/**
 * The inventory sku of a catalogue item: the catalogue id, as the patient's cart sends it (an order line's matched_sku) and
 * as the provider app's "add from catalogue" stores it.
 */
export function catalogueSku(medicine: { id?: unknown }): string {
  return String(medicine.id);
}

/** The reference price of a catalogue item (D-12: the SFDA price, else the catalogue price); null when it has none. */
export function cataloguePrice(medicine: { sfda_price?: unknown; price?: unknown }): number | null {
  for (const value of [medicine.sfda_price, medicine.price]) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
  }
  return null;
}

/** A catalogue item as a search row the composer can pick (no inventory id yet: it is priced from the catalogue). */
export function catalogueSearchRow(medicine: any) {
  return {
    id: null,
    source: 'catalogue' as const,
    medicine_id: medicine.id,
    sku: catalogueSku(medicine),
    barcode: medicine.barcode ?? null,
    name_ar: medicine.name_ar,
    name_en: medicine.name_en ?? null,
    generic_name: medicine.generic_name || medicine.active_ingredient || null,
    form: medicine.form ?? null,
    dosage: medicine.strength ?? null,
    price: cataloguePrice(medicine),
    stock: null,
  };
}
