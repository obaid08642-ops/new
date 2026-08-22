import { z } from "zod";

const doctorId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const doctorSchema = z.object({
  id: doctorId.optional(), _id: doctorId.optional(),
  name_ar: z.string().max(180).optional(), name_en: z.string().max(180).optional(), name: z.string().max(180).optional(), display_name: z.string().max(180).optional(),
  degree: z.string().max(120).optional(), title: z.string().max(120).optional(),
  specialty_ar: z.string().max(180).optional(), specialty: z.string().max(180).optional(),
  rating: z.number().min(0).max(5).optional(), review_count: z.number().int().nonnegative().optional(), reviews_count: z.number().int().nonnegative().optional(),
  consultation_fee: z.number().nonnegative().optional(), price: z.number().nonnegative().optional(), average_wait: z.number().nonnegative().optional(), years_experience: z.number().int().nonnegative().optional(), experience_years: z.number().int().nonnegative().optional(),
  offers_online: z.boolean().optional(), offers_clinic: z.boolean().optional(), offers_home: z.boolean().optional(), accepts_insurance: z.boolean().optional(), facility_name: z.string().max(180).optional(), clinic_name: z.string().max(180).optional(), next_available_slot: z.string().max(80).optional(),
}).strip();
export type DoctorRow = { id: string; name?: string; degree?: string; specialty?: string; rating?: number; reviews?: number; price?: number; waitMinutes?: number; experienceYears?: number; online: boolean; clinic: boolean; home: boolean; acceptsInsurance: boolean; facility?: string; nextSlot?: string };
function rowsFrom(payload: unknown): unknown[] { if (Array.isArray(payload)) return payload; if (payload && typeof payload === "object" && !Array.isArray(payload)) { const root=payload as Record<string,unknown>; for (const key of ["data","items","doctors","results"]) if (Array.isArray(root[key])) return root[key]; } return []; }
export function extractDoctors(payload: unknown): DoctorRow[] { return rowsFrom(payload).flatMap((value) => { const parsed=doctorSchema.safeParse(value); if(!parsed.success) return []; const d=parsed.data; const id=d.id ?? d._id; if(!id) return []; const name=d.name_ar ?? d.name_en ?? d.name ?? d.display_name; const specialty=d.specialty_ar ?? d.specialty; return [{ id, name, degree:d.degree ?? d.title, specialty, rating:d.rating, reviews:d.review_count ?? d.reviews_count, price:d.consultation_fee ?? d.price, waitMinutes:d.average_wait, experienceYears:d.years_experience ?? d.experience_years, online:d.offers_online ?? false, clinic:d.offers_clinic ?? false, home:d.offers_home ?? false, acceptsInsurance:d.accepts_insurance ?? false, facility:d.facility_name ?? d.clinic_name, nextSlot:d.next_available_slot }]; }); }
export function doctorQuery(input: { search?: string; specialty?: string; sort?: "rating" | "price" | "wait" }) { const params=new URLSearchParams(); const search=(input.search ?? input.specialty ?? "").trim(); if(search) params.set("search", search.slice(0,100)); if(input.sort) params.set("sort", input.sort); const query=params.toString(); return `/care/doctors${query ? `?${query}` : ""}`; }
export function parseDoctorId(value: string) { return doctorId.safeParse(value); }
