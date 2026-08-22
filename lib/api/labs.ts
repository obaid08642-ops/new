import { z } from "zod";

const labServiceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const labServiceSchema = z.object({
  id: labServiceIdSchema,
  name_ar: z.string().min(1).max(180).optional(),
  name_en: z.string().min(1).max(180).optional(),
  short_code: z.string().max(80).optional(),
  description_ar: z.string().max(2000).optional(),
  description_en: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  sample_type: z.string().max(100).optional(),
  price: z.number().nonnegative().optional(),
  old_price: z.number().nonnegative().optional(),
  fasting_required: z.boolean().optional(),
  fasting_hours: z.number().nonnegative().optional(),
  home_visit_supported: z.boolean().optional(),
  facility_visit_supported: z.boolean().optional(),
  turnaround_hours: z.number().nonnegative().optional(),
  preparation_ar: z.string().max(2000).optional(),
  preparation_en: z.string().max(2000).optional(),
  insurance_availability: z.boolean().optional(),
  home_collection_availability: z.boolean().optional(),
  in_lab_availability: z.boolean().optional(),
  medical_referral_required: z.boolean().optional(),
  unavailable: z.boolean().optional(),
  image_url: z.string().url().max(2048).optional(),
  icon: z.string().max(120).optional(),
}).strip();

export type LabService = {
  id: string; nameAr?: string; nameEn?: string; shortCode?: string;
  descriptionAr?: string; descriptionEn?: string; category?: string; sampleType?: string;
  price?: number; oldPrice?: number; fastingRequired?: boolean; fastingHours?: number;
  homeVisitSupported?: boolean; facilityVisitSupported?: boolean; turnaroundHours?: number;
  preparationAr?: string; preparationEn?: string; insuranceAvailable?: boolean;
  homeCollectionAvailable?: boolean; inLabAvailable?: boolean; referralRequired?: boolean;
  unavailable?: boolean; imageUrl?: string; icon?: string;
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
  return {
    id: item.id, nameAr: item.name_ar, nameEn: item.name_en, shortCode: item.short_code,
    descriptionAr: item.description_ar, descriptionEn: item.description_en, category: item.category,
    sampleType: item.sample_type, price: item.price, oldPrice: item.old_price,
    fastingRequired: item.fasting_required, fastingHours: item.fasting_hours,
    homeVisitSupported: item.home_visit_supported, facilityVisitSupported: item.facility_visit_supported,
    turnaroundHours: item.turnaround_hours, preparationAr: item.preparation_ar, preparationEn: item.preparation_en,
    insuranceAvailable: item.insurance_availability, homeCollectionAvailable: item.home_collection_availability,
    inLabAvailable: item.in_lab_availability, referralRequired: item.medical_referral_required,
    unavailable: item.unavailable, imageUrl: item.image_url, icon: item.icon,
  };
}

export function parseLabServiceId(value: string) { return labServiceIdSchema.safeParse(value); }
export function extractLabServices(payload: unknown) { return rowsFrom(payload).flatMap((value) => { const item = parseLabService(value); return item ? [item] : []; }); }
export function extractLabService(payload: unknown) {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : payload;
  const item = root && typeof root === "object" && !Array.isArray(root) && "data" in root ? (root as Record<string, unknown>).data : root;
  return parseLabService(item);
}
