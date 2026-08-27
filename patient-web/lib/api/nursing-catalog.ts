import { z } from "zod";

const rowSchema = z.object({
  id: z.string().trim().min(1).max(200),
  category: z.string().trim().max(120).optional(),
  name_ar: z.string().trim().max(240).optional(),
  name_en: z.string().trim().max(240).optional(),
  description_ar: z.string().trim().max(1000).optional(),
  description_en: z.string().trim().max(1000).optional(),
  duration: z.string().trim().max(80).optional(),
  duration_value: z.number().finite().positive().max(1000).optional(),
  price: z.number().finite().nonnegative().max(100000).optional(),
  insurance_availability: z.boolean().optional(),
  cash_availability: z.boolean().optional(),
  active: z.boolean().optional(),
}).strip();

export type NursingCatalogItem = { id:string; category?:string; nameAr?:string; nameEn?:string; descriptionAr?:string; descriptionEn?:string; duration?:string; durationValue?:number; price?:number; insuranceAvailable?:boolean; cashAvailable?:boolean };

export function extractNursingCatalog(value: unknown): NursingCatalogItem[] {
  const rows = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { data?:unknown }).data) ? (value as { data:unknown[] }).data : [];
  return rows.flatMap((row) => { const parsed = rowSchema.safeParse(row); if (!parsed.success || parsed.data.active === false) return []; const v=parsed.data; return [{ id:v.id, category:v.category, nameAr:v.name_ar, nameEn:v.name_en, descriptionAr:v.description_ar, descriptionEn:v.description_en, duration:v.duration, durationValue:v.duration_value, price:v.price, insuranceAvailable:v.insurance_availability, cashAvailable:v.cash_availability }]; });
}
