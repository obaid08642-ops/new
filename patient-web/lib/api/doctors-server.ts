import { patientApiUrl } from "@/lib/api/upstream";
import { doctorQuery, doctorSlotsQuery } from "./doctors";
import { filterApiParams, type DoctorFilters } from "@/lib/consult/doctor-filters";

/**
 * F82-1: the public doctor list carries no credential, so the unfiltered list (home cards and the
 * first view of /consultations/doctors) goes through the Next data cache for a minute. A search
 * or specialty text is free-form and would fill the cache with one entry per query, so it is never cached.
 */
export async function getPublicDoctors(input: { search?: string; specialty?: string; sort?: "rating" | "price" | "wait"; filters?: DoctorFilters } = {}): Promise<Response | null> {
  // a position or a window of minutes is free-form too: a filtered list is never cached
  const cacheable = !(input.search ?? input.specialty ?? "").trim() && !(input.filters && filterApiParams(input.filters).length > 0);
  try { return await fetch(patientApiUrl(doctorQuery(input)), { headers: { Accept: "application/json" }, ...(cacheable ? { next: { revalidate: 60 } } : { cache: "no-store" as const }) }); } catch { return null; }
}

export async function getPublicDoctor(doctorId: string): Promise<Response | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(doctorId)) throw new Error("invalid_doctor_id");
  try { return await fetch(patientApiUrl(`/care/doctors/${doctorId}`), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}

/**
 * The public doctor page's record (GET /entity-graph/related/doctor/:slug): credential-free, so it goes through the
 * Next data cache for an hour (ISR, F68/F82). The page and its metadata ask for the same URL and share one entry.
 * Reads no cookie or header.
 */
export async function getPublicDoctorEntity(slug: string): Promise<Response | null> {
  try { return await fetch(patientApiUrl(`/entity-graph/related/doctor/${encodeURIComponent(slug)}`), { headers: { Accept: "application/json" }, next: { revalidate: 3600 } }); } catch { return null; }
}

export async function getPublicDoctorSlots(input: { id: string; date: string; serviceType: "clinic" | "video" | "home" }): Promise<Response | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.id) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input.date)) throw new Error("invalid_slots_query");
  try { return await fetch(patientApiUrl(doctorSlotsQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}
