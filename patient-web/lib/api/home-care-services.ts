import { z } from "zod";
import { namesOf, textsOf, translatedColumns, type Texts } from "@/lib/i18n/localized";

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
  ...translatedColumns("description", 2000),
  price: z.number().nonnegative().optional(),
  duration_value: z.number().positive().optional(),
  duration: z.string().max(40).optional(),
  insurance_availability: z.boolean().optional(),
  preparation_ar: z.union([z.array(z.string().max(500)).max(30), z.string().max(2000)]).optional(),
  preparation_en: z.union([z.array(z.string().max(500)).max(30), z.string().max(2000)]).optional(),
  requires_patient_medication: z.boolean().optional(),
  image_url: z.string().url().max(2048).optional(),
  icon: z.string().max(120).optional(),
}).strip();

export type HomeCareService = {
  /** the name and description in every language the server holds (Urdu, Hindi, Bengali and Filipino included) */
  names: Texts;
  descriptions: Texts;
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
  preparationAr?: string[];
  preparationEn?: string[];
  /** The catalogue says the service needs the patient's prescription (injections, drips); unset when the record does not say. */
  requiresPrescription?: boolean;
  imageUrl?: string;
  icon?: string;
};

function rowsFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const root = payload as Record<string, unknown>;
    for (const key of ["data", "items", "services", "results"]) if (Array.isArray(root[key])) return root[key];
  }
  return [];
}

/** A preparation sent as a list or as one text with a line per step. */
function lines(value: string[] | string | undefined): string[] | undefined {
  const list = (Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n/) : []).map((line) => line.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

function parseService(value: unknown): HomeCareService | null {
  const parsed = serviceSchema.safeParse(value);
  if (!parsed.success) return null;
  const item = parsed.data;
  const nameAr = item.name_ar ?? item.name;
  const nameEn = item.name_en ?? item.name;
  if (!nameAr && !nameEn) return null;
  const row = value as Record<string, unknown>;
  const names = { ...(item.name ? { ar: item.name, en: item.name } : {}), ...namesOf(row) };
  const descriptions = { ...(item.description ? { ar: item.description, en: item.description } : {}), ...textsOf(row, "description") };
  return { names, descriptions, id: item.id, slug: item.slug, nameAr, nameEn, descriptionAr: item.description_ar ?? item.description, descriptionEn: item.description_en ?? item.description, price: item.price, durationValue: item.duration_value, duration: item.duration, insuranceAvailable: item.insurance_availability, preparationAr: lines(item.preparation_ar), preparationEn: lines(item.preparation_en), requiresPrescription: item.requires_patient_medication, imageUrl: item.image_url, icon: item.icon };
}

export function parseHomeCareServiceId(value: string) { return serviceIdSchema.safeParse(value); }
export function extractHomeCareServices(payload: unknown) { return rowsFrom(payload).flatMap((value) => { const service = parseService(value); return service ? [service] : []; }); }
/** One service out of the public catalog (GET /nursing/catalog), by id: the public page reads it there because the per-service endpoint needs a session. */
export function findHomeCareServiceInCatalog(payload: unknown, serviceId: string) {
  return extractHomeCareServices(payload).find((service) => service.id === serviceId) ?? null;
}
export function extractHomeCareService(payload: unknown) {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : payload;
  const item = root && typeof root === "object" && !Array.isArray(root) && "data" in root ? (root as Record<string, unknown>).data : root;
  return parseService(item);
}
