import { z } from "zod";

const serviceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const serviceSchema = z.object({
  id: serviceIdSchema,
  slug: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).optional(),
  name_ar: z.string().min(1).max(180).optional(),
  name_en: z.string().min(1).max(180).optional(),
  name: z.string().min(1).max(180).optional(),
  description_ar: z.string().max(2000).optional(),
  description_en: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative().optional(),
  duration_value: z.number().positive().optional(),
  duration: z.string().max(40).optional(),
  insurance_availability: z.boolean().optional(),
}).strip();

export type HomeCareService = {
  id: string;
  slug?: string;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price?: number;
  durationValue?: number;
  duration?: string;
  insuranceAvailable?: boolean;
};

function rowsFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const root = payload as Record<string, unknown>;
    for (const key of ["data", "items", "services", "results"]) if (Array.isArray(root[key])) return root[key];
  }
  return [];
}

function parseService(value: unknown): HomeCareService | null {
  const parsed = serviceSchema.safeParse(value);
  if (!parsed.success) return null;
  const item = parsed.data;
  const nameAr = item.name_ar ?? item.name;
  const nameEn = item.name_en ?? item.name;
  if (!nameAr && !nameEn) return null;
  return { id: item.id, slug: item.slug, nameAr, nameEn, descriptionAr: item.description_ar ?? item.description, descriptionEn: item.description_en ?? item.description, price: item.price, durationValue: item.duration_value, duration: item.duration, insuranceAvailable: item.insurance_availability };
}

export function parseHomeCareServiceId(value: string) { return serviceIdSchema.safeParse(value); }
export function extractHomeCareServices(payload: unknown) { return rowsFrom(payload).flatMap((value) => { const service = parseService(value); return service ? [service] : []; }); }
export function extractHomeCareService(payload: unknown) {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : payload;
  const item = root && typeof root === "object" && !Array.isArray(root) && "data" in root ? (root as Record<string, unknown>).data : root;
  return parseService(item);
}
