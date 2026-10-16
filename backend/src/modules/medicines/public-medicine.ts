/**
 * Issue 1555: what an anonymous caller may see of a catalogue medicine.
 *
 * Two shapes leave the public routes:
 * - the public product card (`toPublicProductCard`), the one GET /public/products/search answers with; it is built from
 *   the strict per-locale DTO (resolveMedicinePublicDto), so it carries the prescription rule (no old price or discount
 *   on a prescription item);
 * - the catalogue row the apps and the web read (name_ar, dosage_en, translations...), for the routes whose clients read
 *   those columns. `toPublicMedicine` removes every governance, audit, import and stock field from it, at any depth.
 *
 * Only items that pass the public catalogue filter (approved, public, not deleted) reach either shape; the filter is
 * applied by the query of each route.
 */
import { resolveMedicinePublicDto } from './med-i18n';

/** Fields of a medicine record that never leave a public route. */
export const MEDICINE_INTERNAL_FIELDS: ReadonlySet<string> = new Set([
  '_id', '__v',
  // Import and provenance.
  'provenance', 'source', 'source_product_id', 'translation_conflict', 'search_text',
  // Editorial workflow and audit.
  'pending_revision', 'review_reason', 'medical_review_status', 'last_reviewed', 'public_eligibility', 'indexing_eligibility',
  'verified', 'approved_by', 'approved_at', 'rejected_reason', 'change_requests', 'version',
  'created_by', 'created_by_user_id', 'created_by_role', 'updated_by', 'deleted_at', 'deleted_by', 'is_deleted',
  // Stock and analytics.
  'aggregate_stock', 'pharmacies_count', 'usage_count', 'score',
  // Price source bookkeeping (the price itself stays).
  'sfda_price_source', 'sfda_price_updated_at',
]);

/** Families of internal keys, so a new audit or review field is withheld before anyone lists it above. */
const INTERNAL_KEY_PATTERNS: readonly RegExp[] = [
  /review/i, /^provenance/i, /^source/i, /^created_by/i, /^updated_by/i, /^deleted/i, /^approved_/i, /^rejected_/i,
  /eligibility$/i, /password|secret/i,
];

export function isInternalMedicineKey(key: string): boolean {
  return MEDICINE_INTERNAL_FIELDS.has(key) || INTERNAL_KEY_PATTERNS.some((re) => re.test(key));
}

function plain(value: unknown): unknown {
  const v = value as { toObject?: () => unknown } | null;
  return v && typeof v === 'object' && typeof v.toObject === 'function' ? v.toObject() : value;
}

/**
 * A medicine row (or a list, or a payload holding rows) with only public fields. Applied at the return of each public
 * route, after any cache, so a row cached before this rule is also cleaned. Prescription items lose the old price and
 * the discount, as the public product card does (decision 10).
 */
export function toPublicMedicine<T>(value: T): T {
  const v = plain(value);
  if (Array.isArray(v)) return v.map((x) => toPublicMedicine(x)) as unknown as T;
  if (!v || typeof v !== 'object') return v as T;
  // Dates, ObjectIds and other class instances are values, not records: kept as they are.
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return v as T;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(v as Record<string, unknown>)) {
    if (isInternalMedicineKey(key)) continue;
    out[key] = toPublicMedicine(child);
  }
  if (out.requires_prescription === true || out.is_rx === true) {
    delete out.old_price;
    if ('discount_percent' in out) out.discount_percent = 0;
    if ('has_discount' in out) out.has_discount = false;
  }
  return out as T;
}

/** The public product card of GET /public/products/search, for one locale. */
export function toPublicProductCard(raw: Record<string, any>, locale: string) {
  const dto = resolveMedicinePublicDto(plain(raw) as Record<string, any>, locale);
  return {
    sku: dto.sku, id: dto.id, slug: dto.slug, name: dto.name, official_name: dto.official_name,
    description: dto.description, category: dto.category, sub_category: dto.sub_category,
    form: dto.form, strength: dto.strength, package_size: dto.package_size,
    active_ingredient: dto.active_ingredient, manufacturer: dto.manufacturer,
    price: dto.price, old_price: dto.old_price, currency: dto.currency,
    is_rx: dto.is_rx, online_exclusive: dto.online_exclusive, available: dto.available, image: dto.image,
    url: `${process.env.WEB_PUBLIC_URL || 'https://nabd.plus'}/${locale}/p/${encodeURIComponent(String(dto.slug))}`,
  };
}
