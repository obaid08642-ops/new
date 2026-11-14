// Pure rules of the "My services and prices" screen (lab, radiology, nursing): what the provider typed -> the PUT /provider/services/:vertical/:serviceId body.

export type Vertical = 'lab' | 'radiology' | 'nursing';
export type Where = 'premises' | 'home' | 'both';

export interface ServiceOfferRow {
  service_id: string; code: string; name_ar: string | null; name_en: string | null; category: string | null; image_url: string | null;
  catalogue_price: number | null; home_visit_supported: boolean;
  offered: boolean; where: Where | null; insurance: boolean; price: number | null; currency: string;
}

export interface OfferDraft { offered: boolean; where: Where; insurance: boolean; price: string }

export interface OfferBody { offered: boolean; where?: Where; insurance: boolean; price?: number }

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** "1,200", "١٢٠٠", "95.5" -> a positive number rounded to halalas, or null for empty/zero/garbage. */
export function parsePrice(text: string): number | null {
  const ascii = String(text ?? '')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[٬,\s]/g, '')
    .replace('٫', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(ascii)) return null;
  const n = Number(ascii);
  return n > 0 ? Math.round(n * 100) / 100 : null;
}

/** Where options the provider may pick: homes only where the service can be done at home (nursing always). */
export function whereOptions(vertical: Vertical, row: Pick<ServiceOfferRow, 'home_visit_supported'>): Where[] {
  if (vertical === 'nursing') return ['home', 'premises', 'both'];
  return row.home_visit_supported ? ['premises', 'home', 'both'] : ['premises'];
}

export function draftFromRow(vertical: Vertical, row: ServiceOfferRow): OfferDraft {
  const options = whereOptions(vertical, row);
  const where = row.where && options.includes(row.where) ? row.where : options[0];
  return { offered: row.offered, where, insurance: row.insurance, price: String(row.price ?? row.catalogue_price ?? '') };
}

/** null = fine. A service that is offered needs a positive price (a priceless service cannot be booked). */
export function draftError(d: OfferDraft): 'price_invalid' | null {
  if (d.offered && parsePrice(d.price) === null) return 'price_invalid';
  return null;
}

export function buildBody(vertical: Vertical, row: ServiceOfferRow, d: OfferDraft): OfferBody {
  if (!d.offered) return { offered: false, insurance: false };
  const body: OfferBody = { offered: true, where: whereOptions(vertical, row).includes(d.where) ? d.where : whereOptions(vertical, row)[0], insurance: d.insurance };
  const price = parsePrice(d.price);
  if (price !== null) body.price = price;
  return body;
}

/** The price the patient pays: the provider's own, else the catalogue price. */
export function shownPrice(row: ServiceOfferRow): number | null {
  return row.price ?? row.catalogue_price;
}

export function matchesSearch(row: ServiceOfferRow, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [row.name_ar, row.name_en, row.code, row.category].some((f) => (f ?? '').toLowerCase().includes(s));
}
