import { z } from "zod";

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const serviceSchema = z.object({
  _id: idSchema.optional(), id: idSchema.optional(), short_code: z.string().max(80).optional(),
  name_ar: z.string().min(1).max(180).optional(), name_en: z.string().min(1).max(180).optional(),
  modality: z.string().max(80).optional(), body_part: z.string().max(100).optional(),
  price: z.number().nonnegative().optional(), old_price: z.number().nonnegative().optional(),
  contrast_required: z.boolean().optional(), fasting_required: z.boolean().optional(),
  description_ar: z.string().max(2000).optional(), description_en: z.string().max(2000).optional(),
  preparation_ar: z.array(z.string().max(500)).max(40).optional(), preparation_en: z.array(z.string().max(500)).max(40).optional(),
  popularity: z.number().finite().optional(), estimated_duration_minutes: z.number().nonnegative().optional(), turnaround_hours: z.number().nonnegative().optional(),
  home_visit_supported: z.boolean().optional(), facility_visit_supported: z.boolean().optional(), image_url: z.string().url().max(2048).optional(),
}).strip();
export type RadiologyService = { id:string; shortCode?:string; nameAr?:string; nameEn?:string; modality?:string; bodyPart?:string; price?:number; oldPrice?:number; contrastRequired?:boolean; fastingRequired?:boolean; descriptionAr?:string; descriptionEn?:string; preparationAr?:string[]; preparationEn?:string[]; popularity?:number; durationMinutes?:number; turnaroundHours?:number; homeVisitSupported?:boolean; facilityVisitSupported?:boolean; imageUrl?:string };
function rows(value: unknown): unknown[] { if (Array.isArray(value)) return value; const r=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null; for(const k of ['data','items','services','results']) if(Array.isArray(r?.[k])) return r[k] as unknown[]; return []; }
function parse(value: unknown): RadiologyService|null { const p=serviceSchema.safeParse(value); if(!p.success || (!p.data._id&&!p.data.id) || (!p.data.name_ar&&!p.data.name_en)) return null; const x=p.data; return { id:x._id??x.id!, shortCode:x.short_code, nameAr:x.name_ar, nameEn:x.name_en, modality:x.modality, bodyPart:x.body_part, price:x.price, oldPrice:x.old_price, contrastRequired:x.contrast_required, fastingRequired:x.fasting_required, descriptionAr:x.description_ar, descriptionEn:x.description_en, preparationAr:x.preparation_ar, preparationEn:x.preparation_en, popularity:x.popularity, durationMinutes:x.estimated_duration_minutes, turnaroundHours:x.turnaround_hours, homeVisitSupported:x.home_visit_supported, facilityVisitSupported:x.facility_visit_supported, imageUrl:x.image_url }; }
export function parseRadiologyServiceId(value:string){return idSchema.safeParse(value)}
export function extractRadiologyServices(value:unknown){return rows(value).flatMap(v=>{const x=parse(v);return x?[x]:[]})}
