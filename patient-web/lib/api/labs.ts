import { z } from "zod";
import { namesOf, pickName, textsOf, translatedColumns, type Texts } from "@/lib/i18n/localized";
import { listsOf, type TextLists } from "@/lib/i18n/localized-lists";

const labServiceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const labServiceSchema = z.object({
  id: labServiceIdSchema,
  name_ar: z.string().min(1).max(180).optional(),
  name_en: z.string().min(1).max(180).optional(),
  short_code: z.string().max(80).optional(),
  description_ar: z.string().max(2000).optional(),
  description_en: z.string().max(2000).optional(),
  ...translatedColumns("description", 2000),
  preparation_ur: z.array(z.string().max(500)).max(40).optional(),
  preparation_hi: z.array(z.string().max(500)).max(40).optional(),
  preparation_bn: z.array(z.string().max(500)).max(40).optional(),
  preparation_tl: z.array(z.string().max(500)).max(40).optional(),
  category: z.string().max(100).optional(),
  sample_type: z.string().max(100).optional(),
  price: z.number().nonnegative().optional(),
  old_price: z.number().nonnegative().optional(),
  fasting_required: z.boolean().optional(),
  fasting_hours: z.number().nonnegative().optional(),
  home_visit_supported: z.boolean().optional(),
  facility_visit_supported: z.boolean().optional(),
  turnaround_hours: z.number().nonnegative().optional(),
  preparation_ar: z.array(z.string().max(500)).max(40).optional(),
  preparation_en: z.array(z.string().max(500)).max(40).optional(),
  is_package: z.boolean().optional(),
  included_services: z.array(z.string().max(180)).max(100).optional(),
  special_notes: z.string().max(2000).optional(),
  insurance_availability: z.boolean().optional(),
  cash_availability: z.boolean().optional(),
  home_collection_availability: z.boolean().optional(),
  in_lab_availability: z.boolean().optional(),
  medical_referral_required: z.boolean().optional(),
  unavailable: z.boolean().optional(),
  image_url: z.string().url().max(2048).optional(),
  icon: z.string().max(120).optional(),
  popularity: z.number().finite().optional(),
}).strip();

export type LabService = {
  /** name, description and preparation in every language the server holds (Urdu, Hindi, Bengali, Filipino included) */
  names: Texts; descriptions: Texts; preparations: TextLists;
  id: string; nameAr?: string; nameEn?: string; shortCode?: string;
  descriptionAr?: string; descriptionEn?: string; category?: string; sampleType?: string;
  price?: number; oldPrice?: number; fastingRequired?: boolean; fastingHours?: number;
  homeVisitSupported?: boolean; facilityVisitSupported?: boolean; turnaroundHours?: number;
  preparationAr?: string[]; preparationEn?: string[]; isPackage?: boolean; includedServices?: string[]; specialNotes?: string; insuranceAvailable?: boolean;
  /** Decision 30: the patient may pay for it themselves (`cash_availability`, absent = yes). */
  cashAvailable?: boolean;
  homeCollectionAvailable?: boolean; inLabAvailable?: boolean; referralRequired?: boolean;
  unavailable?: boolean; imageUrl?: string; icon?: string;
  /** The backend's own request count/score (`popularity`); the catalogue list arrives sorted by it. */
  popularity?: number;
};

function rowsFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const root = payload as Record<string, unknown>;
    for (const key of ["data", "items", "services", "results"]) if (Array.isArray(root[key])) return root[key];
  }
  return [];
}

function parseLabService(value: unknown): LabService | null {
  const parsed = labServiceSchema.safeParse(value);
  if (!parsed.success) return null;
  const item = parsed.data;
  if (!item.name_ar && !item.name_en) return null;
  const row = value as Record<string, unknown>;
  return {
    names: namesOf(row), descriptions: textsOf(row, "description"), preparations: listsOf(row, "preparation"),
    id: item.id, nameAr: item.name_ar, nameEn: item.name_en, shortCode: item.short_code,
    descriptionAr: item.description_ar, descriptionEn: item.description_en, category: item.category,
    sampleType: item.sample_type, price: item.price, oldPrice: item.old_price,
    fastingRequired: item.fasting_required, fastingHours: item.fasting_hours,
    homeVisitSupported: item.home_visit_supported, facilityVisitSupported: item.facility_visit_supported,
    turnaroundHours: item.turnaround_hours, preparationAr: item.preparation_ar, preparationEn: item.preparation_en,
    isPackage: item.is_package, includedServices: item.included_services, specialNotes: item.special_notes,
    insuranceAvailable: item.insurance_availability, cashAvailable: item.cash_availability, homeCollectionAvailable: item.home_collection_availability,
    inLabAvailable: item.in_lab_availability, referralRequired: item.medical_referral_required,
    unavailable: item.unavailable, imageUrl: item.image_url, icon: item.icon, popularity: item.popularity,
  };
}

export function parseLabServiceId(value: string) { return labServiceIdSchema.safeParse(value); }
export function extractLabServices(payload: unknown) { return rowsFrom(payload).flatMap((value) => { const item = parseLabService(value); return item ? [item] : []; }); }
export function extractLabService(payload: unknown) {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : payload;
  const item = root && typeof root === "object" && !Array.isArray(root) && "data" in root ? (root as Record<string, unknown>).data : root;
  return parseLabService(item);
}

/** Decision 30 (owner 2026-10-14, question 5): the hub's "Insurance" lists what takes insurance, "Self-pay" what the patient may pay. */
export type LabPay = "insurance" | "self_pay";
export const labPaymentFits = (pay: LabPay, service: Pick<LabService, "insuranceAvailable" | "cashAvailable">): boolean =>
  pay === "insurance" ? service.insuranceAvailable === true : service.cashAvailable !== false;

/** True when at least one bookable service takes insurance; when none does, the hub does not offer the insurance choice. */
export const insuranceOffered = (services: ReadonlyArray<Pick<LabService, "insuranceAvailable" | "cashAvailable" | "unavailable">>): boolean =>
  services.some((s) => !s.unavailable && labPaymentFits("insurance", s));

/**
 * A package stores the tests it includes as text (their Arabic names, or their codes). Each one is shown in the page's language
 * when the lab list knows the test (by its id, its code or its name in any language); a test the list does not know stays as stored.
 */
export function includedTestNames(locale: string, included: readonly string[], tests: readonly LabService[]): string[] {
  const key = (value: string) => value.trim().toLocaleLowerCase();
  const index = new Map<string, LabService>();
  for (const test of tests) {
    for (const value of [test.id, test.shortCode, ...Object.values(test.names)]) if (value) index.set(key(value), test);
  }
  return included.map((entry) => {
    const test = index.get(key(entry));
    return (test && pickName(locale, test.names)) || entry;
  });
}
