import { z } from "zod";
import { filterApiParams, serverOrdersList, type DoctorFilters } from "@/lib/consult/doctor-filters";
import { isSpecialtySlug } from "@/lib/specialties";

const doctorId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const doctorSchema = z.object({
  id: doctorId.optional().nullable(), _id: doctorId.optional().nullable(),
  name_ar: z.string().max(180).optional().nullable(), name_en: z.string().max(180).optional().nullable(), name: z.string().max(180).optional().nullable(), display_name: z.string().max(180).optional().nullable(),
  degree: z.string().max(120).optional().nullable(), title: z.string().max(120).optional().nullable(),
  specialty_ar: z.string().max(180).optional().nullable(), specialty: z.string().max(180).optional().nullable(), academic_degree: z.string().max(120).optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(), review_count: z.number().int().nonnegative().optional().nullable(), reviews_count: z.number().int().nonnegative().optional().nullable(),
  consultation_fee: z.number().nonnegative().optional().nullable(), price: z.number().nonnegative().optional().nullable(), price_clinic: z.number().nonnegative().optional().nullable(), price_online: z.number().nonnegative().optional().nullable(), price_home: z.number().nonnegative().optional().nullable(), average_wait: z.number().nonnegative().optional().nullable(), years_experience: z.number().int().nonnegative().optional().nullable(), experience_years: z.number().int().nonnegative().optional().nullable(),
  offers_online: z.boolean().optional().nullable(), offers_clinic: z.boolean().optional().nullable(), offers_home: z.boolean().optional().nullable(), accepts_insurance: z.boolean().optional().nullable(), verified: z.boolean().optional().nullable(), scfhs_license_no: z.string().max(80).optional().nullable(), photo_url: z.string().max(400).optional().nullable(), clinicPhotos: z.array(z.string().max(400)).max(20).optional().nullable(), facility_name: z.string().max(180).optional().nullable(), clinic_name: z.string().max(180).optional().nullable(), hospital: z.string().max(180).optional().nullable(), next_available_slot: z.string().max(80).optional().nullable(), next_available_at: z.string().max(80).optional().nullable(), consultation_modes: z.array(z.string().max(24)).max(8).optional().nullable(),
  gender: z.enum(["male", "female"]).optional().nullable(), is_online: z.boolean().optional().nullable(), wait_time: z.number().nonnegative().optional().nullable(),
  education: z.array(z.object({ degree: z.string().max(180).optional().nullable(), institution: z.string().max(180).optional().nullable(), year: z.number().int().optional().nullable(), verified: z.boolean().optional().nullable() }).strip()).max(20).optional().nullable(),
  certificates: z.array(z.object({ name: z.string().max(180).optional().nullable(), issuer: z.string().max(180).optional().nullable(), year: z.number().int().optional().nullable(), verified: z.boolean().optional().nullable() }).strip()).max(30).optional().nullable(),
  services: z.array(z.object({ name: z.string().max(180).optional().nullable(), name_ar: z.string().max(180).optional().nullable(), name_en: z.string().max(180).optional().nullable(), price: z.number().nonnegative().optional().nullable() }).strip()).max(40).optional().nullable(),
  follow_up_price: z.number().nonnegative().optional().nullable(), follow_up_days: z.number().int().positive().optional().nullable(),
  clinic_address: z.string().max(300).optional().nullable(), location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strip().optional().nullable(),
  accepted_insurance: z.array(z.string().max(120)).max(40).optional().nullable(),
  facility: z.object({ id: z.string().max(128).optional().nullable(), name_ar: z.string().max(180).optional().nullable(), name_en: z.string().max(180).optional().nullable() }).strip().optional().nullable(),
  reviews_data: z.array(z.object({ rating: z.number().min(0).max(5).optional().nullable(), text: z.string().max(2000).optional().nullable(), date: z.string().max(80).optional().nullable(), reviewer: z.string().max(60).optional().nullable(), sub_ratings: z.array(z.object({ key: z.string().max(40), value: z.number().min(0).max(5) }).strip()).max(8).optional().nullable() }).strip()).max(50).optional().nullable(),
  bio: z.string().max(4000).optional().nullable(), languages: z.array(z.string().max(24)).max(12).optional().nullable(), facility_id: z.string().max(128).optional().nullable(), city: z.string().max(120).optional().nullable(), district: z.string().max(120).optional().nullable(),
}).strip();
export type DoctorRow = { id: string; /** The fee of each visit type the doctor offers (positive prices only). */ prices?: { clinic?: number; video?: number; home?: number }; name?: string; nameAr?: string; nameEn?: string; degree?: string; specialty?: string; rating?: number; reviews?: number; price?: number; waitMinutes?: number; experienceYears?: number; online: boolean; clinic: boolean; home: boolean; acceptsInsurance: boolean; facility?: string; nextSlot?: string; /** Admin-approved and licence-verified (`verified`, Q-20/D-17): the seal is drawn only when true. */ verified: boolean; licenseNo?: string; /** The doctor's photo and clinic photos as website addresses (2-web#3); none when the doctor has not added one. */ photo?: string; clinicPhotos?: string[]; /** The about text, the spoken languages (codes), the clinic's id and its city and district, as the public doctor row sends them. */ bio?: string; languages?: string[]; facilityId?: string; city?: string; district?: string;
  /** Design 2026-10-24: each field is set only when the server sent it; nothing is invented. */
  gender?: "male" | "female"; isOnline?: boolean; education?: DoctorEducation[]; certificates?: DoctorCertificate[]; services?: DoctorService[]; followUp?: { price?: number; days?: number }; clinicAddress?: string; location?: { lat: number; lng: number }; acceptedInsurance?: string[]; facilityNameAr?: string; facilityNameEn?: string; reviewsData?: DoctorReview[] };
export type DoctorEducation = { degree?: string; institution?: string; year?: number; verified: boolean };
export type DoctorCertificate = { name: string; issuer?: string; year?: number; verified: boolean };
export type DoctorService = { name?: string; nameAr?: string; nameEn?: string; price?: number };
export type DoctorReview = { rating?: number; text?: string; date?: string; reviewer?: string; subRatings?: Array<{ key: string; value: number }> };
function rowsFrom(payload: unknown): unknown[] { if (Array.isArray(payload)) return payload; if (payload && typeof payload === "object" && !Array.isArray(payload)) { const root=payload as Record<string,unknown>; for (const key of ["data","items","doctors","results"]) if (Array.isArray(root[key])) return root[key]; } return []; }
/** Positive prices only: the backend sends 0 / null for a mode the doctor does not offer. */
function firstPrice(...values: Array<number | null | undefined>) { return values.find((value): value is number => typeof value === "number" && value > 0); }
/**
 * GET /care/doctors sends the card model of the backend's toPublicDoctor: name_ar / name_en, the specialty SLUG,
 * price_clinic / price_online / price_home, hospital, consultation_modes (clinic | video | home) and next_available_at
 * (an ISO time). The older field names stay accepted for the other doctor endpoints.
 */
const MEDIA_PATH = /^\/api\/v1\/care\/doctors\/([A-Za-z0-9_-]{1,80})\/media\/([A-Za-z0-9_-]{1,80})$/;
/**
 * 2-web#3: a doctor image address from the server as the website shows it. A stored file (the server's public media route)
 * goes through the website's own /api/doctor-media route; an https address is kept; anything else is dropped.
 */
export function doctorMediaSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const m = MEDIA_PATH.exec(url);
  if (m) return `/api/doctor-media/${m[1]}/${m[2]}`;
  return /^https:\/\//i.test(url) ? url : undefined;
}
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
      prices: { clinic: firstPrice(d.price_clinic), video: firstPrice(d.price_online), home: firstPrice(d.price_home) },
      experienceYears: d.years_experience ?? d.experience_years ?? undefined,
      online: Boolean(d.offers_online) || modes.some((mode) => mode === "video" || mode === "online"),
      clinic: Boolean(d.offers_clinic) || modes.includes("clinic"),
      home: Boolean(d.offers_home) || modes.includes("home"),
      acceptsInsurance: Boolean(d.accepts_insurance),
      facility: d.hospital ?? d.facility_name ?? d.clinic_name ?? undefined,
      nextSlot: d.next_available_at ?? d.next_available_slot ?? undefined,
      verified: d.verified === true,
      licenseNo: d.scfhs_license_no || undefined,
      photo: doctorMediaSrc(d.photo_url),
      bio: d.bio || undefined,
      languages: d.languages?.length ? d.languages : undefined,
      facilityId: d.facility_id || undefined,
      city: d.city || undefined,
      district: d.district || undefined,
      gender: d.gender ?? undefined,
      isOnline: typeof d.is_online === "boolean" ? d.is_online : undefined,
      waitMinutes: d.average_wait ?? d.wait_time ?? undefined,
      education: d.education?.length ? d.education.map((e) => ({ degree: e.degree || undefined, institution: e.institution || undefined, year: e.year ?? undefined, verified: e.verified === true })).filter((e) => e.degree || e.institution) : undefined,
      certificates: d.certificates?.length ? d.certificates.flatMap((c) => (c.name ? [{ name: c.name, issuer: c.issuer || undefined, year: c.year ?? undefined, verified: c.verified === true }] : [])) : undefined,
      services: d.services?.length ? d.services.map((x) => ({ name: x.name || undefined, nameAr: x.name_ar || undefined, nameEn: x.name_en || undefined, price: x.price && x.price > 0 ? x.price : undefined })).filter((x) => x.name || x.nameAr || x.nameEn) : undefined,
      followUp: (d.follow_up_price && d.follow_up_price > 0) || d.follow_up_days ? { price: d.follow_up_price && d.follow_up_price > 0 ? d.follow_up_price : undefined, days: d.follow_up_days ?? undefined } : undefined,
      clinicAddress: d.clinic_address || undefined,
      location: d.location ?? undefined,
      acceptedInsurance: d.accepted_insurance?.length ? d.accepted_insurance : undefined,
      facilityNameAr: d.facility?.name_ar || undefined,
      facilityNameEn: d.facility?.name_en || undefined,
      reviewsData: d.reviews_data?.map((r) => ({ rating: r.rating ?? undefined, text: r.text || undefined, date: r.date || undefined, reviewer: r.reviewer || undefined, subRatings: r.sub_ratings?.length ? r.sub_ratings : undefined })).filter((r) => r.rating !== undefined || r.text),
      clinicPhotos: (d.clinicPhotos ?? []).flatMap((url) => { const src = doctorMediaSrc(url); return src ? [src] : []; }),
    }];
  });
}
/** The doctor's name in the page language: Arabic pages the Arabic name, every other language the English one; the other is the fallback (a proper name, not interface text). */
export function doctorDisplayName(doctor: Pick<DoctorRow, "name" | "nameAr" | "nameEn">, locale: string): string | undefined {
  return (locale === "ar" ? doctor.nameAr ?? doctor.nameEn : doctor.nameEn ?? doctor.nameAr) ?? doctor.name;
}
/**
 * The doctors list query. A known specialty slug (the pharmacy cart's "Consult a doctor" and the specialty master) is the backend's
 * exact `specialty` filter; any other specialty text stays the free-text `q` search. Nearest (by position) and Available now are
 * ordered by the server (distance / earliest slot), so the page's own sort does not apply then.
 */
export function doctorQuery(input: { search?: string; specialty?: string; sort?: "rating" | "price" | "wait"; filters?: DoctorFilters }) {
  const params = new URLSearchParams();
  // a specialty slug is its own filter and combines with a text search; any other specialty text is the old free-text search
  const slug = isSpecialtySlug(input.specialty) ? (input.specialty as string).trim() : "";
  const search = (input.search ?? (slug ? "" : input.specialty) ?? "").trim();
  if (slug) params.set("specialty", slug);
  if (search) params.set("q", search.slice(0, 100));
  const serverOrder = input.filters ? serverOrdersList(input.filters) : false;
  if (input.sort && !serverOrder) params.set("sort", input.sort);
  if (input.filters) for (const [key, value] of filterApiParams(input.filters)) params.set(key, value);
  const query = params.toString();
  return `/care/doctors${query ? `?${query}` : ""}`;
}
export function extractDoctor(payload: unknown): DoctorRow | null { const rows = extractDoctors([payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload ? (payload as Record<string, unknown>).data : payload]); return rows[0] ?? null; }
export type DoctorSlot = { start: string; end: string; label: string; available: boolean };
export type DoctorSlots = { date: string; serviceType: "clinic" | "video" | "home"; slots: DoctorSlot[]; reason?: string };
export function extractDoctorSlots(payload: unknown): DoctorSlots | null { if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null; const p=payload as Record<string, unknown>; if(typeof p.date!=="string" || !["clinic","video","home"].includes(String(p.service_type))) return null; const slots=Array.isArray(p.slots)?p.slots.flatMap((s)=>{ if(!s||typeof s!=="object") return []; const x=s as Record<string,unknown>; if(typeof x.start!=="string"||typeof x.end!=="string"||typeof x.label!=="string"||typeof x.available!=="boolean") return []; return [{start:x.start,end:x.end,label:x.label,available:x.available}]; }):[]; return {date:p.date,serviceType:p.service_type as DoctorSlots["serviceType"],slots,reason:typeof p.reason==="string"?p.reason:undefined}; }
export function doctorSlotsQuery(input: { id: string; date: string; serviceType: "clinic" | "video" | "home" }) { return `/care/doctors/${encodeURIComponent(input.id)}/slots?date=${encodeURIComponent(input.date)}&service_type=${input.serviceType}`; }
export function parseDoctorId(value: string) { return doctorId.safeParse(value); }

/** The visit type a doctor's page opens on when the link names none: clinic when offered, else the first mode offered. */
export function defaultVisitType(doctor: Pick<DoctorRow, "clinic" | "online" | "home">): "clinic" | "video" | "home" {
  if (doctor.clinic) return "clinic";
  if (doctor.online) return "video";
  if (doctor.home) return "home";
  return "video";
}

/** The fee of one visit type: that type's own price (not the first price of any type); none when the doctor has no price for it. */
export function priceForVisit(doctor: Pick<DoctorRow, "prices">, type: "clinic" | "video" | "home"): number | undefined {
  return doctor.prices?.[type];
}

/** One row of the public GET /ratings/provider/:id list: score, comment, date and the reviewer's first name only. */
export type PublicRating = { score: number; comment?: string; date?: string; reviewer?: string };
export function extractPublicRatings(payload: unknown): { items: PublicRating[]; total?: number } {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rows = Array.isArray(root.data) ? root.data : [];
  const items = rows.flatMap((value): PublicRating[] => {
    if (!value || typeof value !== "object") return [];
    const r = value as Record<string, unknown>;
    if (typeof r.score !== "number" || r.score < 1 || r.score > 5) return [];
    return [{ score: r.score, comment: typeof r.comment === "string" && r.comment ? r.comment.slice(0, 2000) : undefined, date: typeof r.createdAt === "string" ? r.createdAt : undefined, reviewer: typeof r.reviewer === "string" && r.reviewer ? r.reviewer.slice(0, 60) : undefined }];
  });
  return { items, total: typeof root.total === "number" ? root.total : undefined };
}
