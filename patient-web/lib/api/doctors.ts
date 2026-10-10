import { z } from "zod";

const doctorId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const doctorSchema = z.object({
  id: doctorId.optional().nullable(), _id: doctorId.optional().nullable(),
  name_ar: z.string().max(180).optional().nullable(), name_en: z.string().max(180).optional().nullable(), name: z.string().max(180).optional().nullable(), display_name: z.string().max(180).optional().nullable(),
  degree: z.string().max(120).optional().nullable(), title: z.string().max(120).optional().nullable(),
  specialty_ar: z.string().max(180).optional().nullable(), specialty: z.string().max(180).optional().nullable(), academic_degree: z.string().max(120).optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(), review_count: z.number().int().nonnegative().optional().nullable(), reviews_count: z.number().int().nonnegative().optional().nullable(),
  consultation_fee: z.number().nonnegative().optional().nullable(), price: z.number().nonnegative().optional().nullable(), price_clinic: z.number().nonnegative().optional().nullable(), price_online: z.number().nonnegative().optional().nullable(), price_home: z.number().nonnegative().optional().nullable(), average_wait: z.number().nonnegative().optional().nullable(), years_experience: z.number().int().nonnegative().optional().nullable(), experience_years: z.number().int().nonnegative().optional().nullable(),
  offers_online: z.boolean().optional().nullable(), offers_clinic: z.boolean().optional().nullable(), offers_home: z.boolean().optional().nullable(), accepts_insurance: z.boolean().optional().nullable(), verified: z.boolean().optional().nullable(), scfhs_license_no: z.string().max(80).optional().nullable(), facility_name: z.string().max(180).optional().nullable(), clinic_name: z.string().max(180).optional().nullable(), hospital: z.string().max(180).optional().nullable(), next_available_slot: z.string().max(80).optional().nullable(), next_available_at: z.string().max(80).optional().nullable(), consultation_modes: z.array(z.string().max(24)).max(8).optional().nullable(),
}).strip();
export type DoctorRow = { id: string; name?: string; nameAr?: string; nameEn?: string; degree?: string; specialty?: string; rating?: number; reviews?: number; price?: number; waitMinutes?: number; experienceYears?: number; online: boolean; clinic: boolean; home: boolean; acceptsInsurance: boolean; facility?: string; nextSlot?: string; /** Admin-approved and licence-verified (`verified`, Q-20/D-17): the seal is drawn only when true. */ verified: boolean; licenseNo?: string };
function rowsFrom(payload: unknown): unknown[] { if (Array.isArray(payload)) return payload; if (payload && typeof payload === "object" && !Array.isArray(payload)) { const root=payload as Record<string,unknown>; for (const key of ["data","items","doctors","results"]) if (Array.isArray(root[key])) return root[key]; } return []; }
/** Positive prices only: the backend sends 0 / null for a mode the doctor does not offer. */
function firstPrice(...values: Array<number | null | undefined>) { return values.find((value): value is number => typeof value === "number" && value > 0); }
/**
 * GET /care/doctors sends the card model of the backend's toPublicDoctor: name_ar / name_en, the specialty SLUG,
 * price_clinic / price_online / price_home, hospital, consultation_modes (clinic | video | home) and next_available_at
 * (an ISO time). The older field names stay accepted for the other doctor endpoints.
 */
export function extractDoctors(payload: unknown): DoctorRow[] {
  return rowsFrom(payload).flatMap((value) => {
    const parsed = doctorSchema.safeParse(value);
    if (!parsed.success) return [];
    const d = parsed.data;
    const id = d.id ?? d._id;
    if (!id) return [];
    const modes = d.consultation_modes ?? [];
    return [{
      id,
      name: d.name_ar ?? d.name_en ?? d.name ?? d.display_name ?? undefined,
      nameAr: d.name_ar || undefined,
      nameEn: d.name_en || d.name || d.display_name || undefined,
      degree: d.degree ?? d.academic_degree ?? d.title ?? undefined,
      specialty: d.specialty ?? d.specialty_ar ?? undefined,
      rating: d.rating ?? undefined,
      reviews: d.review_count ?? d.reviews_count ?? undefined,
      price: firstPrice(d.price_clinic, d.price_online, d.price_home, d.consultation_fee, d.price),
      waitMinutes: d.average_wait ?? undefined,
      experienceYears: d.years_experience ?? d.experience_years ?? undefined,
      online: Boolean(d.offers_online) || modes.some((mode) => mode === "video" || mode === "online"),
      clinic: Boolean(d.offers_clinic) || modes.includes("clinic"),
      home: Boolean(d.offers_home) || modes.includes("home"),
      acceptsInsurance: Boolean(d.accepts_insurance),
      facility: d.hospital ?? d.facility_name ?? d.clinic_name ?? undefined,
      nextSlot: d.next_available_at ?? d.next_available_slot ?? undefined,
      verified: d.verified === true,
      licenseNo: d.scfhs_license_no || undefined,
    }];
  });
}
/** The doctor's name in the page language: Arabic pages the Arabic name, every other language the English one; the other is the fallback (a proper name, not interface text). */
export function doctorDisplayName(doctor: Pick<DoctorRow, "name" | "nameAr" | "nameEn">, locale: string): string | undefined {
  return (locale === "ar" ? doctor.nameAr ?? doctor.nameEn : doctor.nameEn ?? doctor.nameAr) ?? doctor.name;
}
export function doctorQuery(input: { search?: string; specialty?: string; sort?: "rating" | "price" | "wait" }) { const params=new URLSearchParams(); const search=(input.search ?? input.specialty ?? "").trim(); if(search) params.set("q", search.slice(0,100)); if(input.sort) params.set("sort", input.sort); const query=params.toString(); return `/care/doctors${query ? `?${query}` : ""}`; }
export function extractDoctor(payload: unknown): DoctorRow | null { const rows = extractDoctors([payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload ? (payload as Record<string, unknown>).data : payload]); return rows[0] ?? null; }
export type DoctorSlot = { start: string; end: string; label: string; available: boolean };
export type DoctorSlots = { date: string; serviceType: "clinic" | "video" | "home"; slots: DoctorSlot[]; reason?: string };
export function extractDoctorSlots(payload: unknown): DoctorSlots | null { if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null; const p=payload as Record<string, unknown>; if(typeof p.date!=="string" || !["clinic","video","home"].includes(String(p.service_type))) return null; const slots=Array.isArray(p.slots)?p.slots.flatMap((s)=>{ if(!s||typeof s!=="object") return []; const x=s as Record<string,unknown>; if(typeof x.start!=="string"||typeof x.end!=="string"||typeof x.label!=="string"||typeof x.available!=="boolean") return []; return [{start:x.start,end:x.end,label:x.label,available:x.available}]; }):[]; return {date:p.date,serviceType:p.service_type as DoctorSlots["serviceType"],slots,reason:typeof p.reason==="string"?p.reason:undefined}; }
export function doctorSlotsQuery(input: { id: string; date: string; serviceType: "clinic" | "video" | "home" }) { return `/care/doctors/${encodeURIComponent(input.id)}/slots?date=${encodeURIComponent(input.date)}&service_type=${input.serviceType}`; }
export function parseDoctorId(value: string) { return doctorId.safeParse(value); }
