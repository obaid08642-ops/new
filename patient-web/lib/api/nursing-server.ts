import { patientApiUrl } from "@/lib/api/upstream";

export type NurseDetail = {
  id: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  city?: string;
  avatar?: string;
  rating?: number;
  specialty?: string;
  specialty_ar?: string;
  specialty_en?: string;
  experience_years?: number;
  bio?: string;
  services?: Array<{
    id: string;
    name: string;
    name_ar?: string;
    name_en?: string;
    price?: number;
    duration?: string;
  }>;
};

export async function getPublicNurse(nurseId: string): Promise<Response | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(nurseId)) throw new Error("invalid_nurse_id");
  try {
    return await fetch(patientApiUrl(`/nursing/nurses/${encodeURIComponent(nurseId)}`), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);

export type NurseListItem = { id: string; name: string; name_ar?: string; name_en?: string; avatar?: string; rating?: number; experience_years?: number };

/** Approved nurses offering this catalog service (public; the same list the patient app shows). */
export async function getNursesForService(serviceId: string): Promise<NurseListItem[] | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(serviceId)) return null;
  try {
    const res = await fetch(patientApiUrl(`/home-care/providers?type=${encodeURIComponent(serviceId)}`), { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return null;
    const raw = await res.json().catch(() => null);
    const list = Array.isArray(raw) ? raw : (raw as { data?: unknown } | null)?.data;
    if (!Array.isArray(list)) return null;
    return list.flatMap((row: unknown) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const id = str(r.id);
      const name = str(r.name_ar) ?? str(r.name) ?? str(r.name_en);
      if (!id || !name) return [];
      return [{
        id, name, name_ar: str(r.name_ar), name_en: str(r.name_en), avatar: str(r.profile_photo),
        rating: typeof r.rating === "number" ? r.rating : undefined,
        experience_years: typeof r.years_experience === "number" ? r.years_experience : undefined,
      }];
    });
  } catch {
    return null;
  }
}

export function extractNurse(payload: unknown): NurseDetail | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = (payload as { data?: unknown }).data ?? payload;
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = String(item.id ?? item._id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(item.name_ar ?? item.name ?? item.name_en ?? ""),
    name_ar: typeof item.name_ar === "string" ? item.name_ar : undefined,
    name_en: typeof item.name_en === "string" ? item.name_en : undefined,
    city: typeof item.city === "string" ? item.city : undefined,
    // Only what the API sends: no default rating, specialty or experience.
    avatar: str(item.avatar) ?? str(item.profile_photo),
    rating: typeof item.rating === "number" ? item.rating : undefined,
    specialty: str(item.specialty_ar) ?? str(item.specialty) ?? str(item.specialty_en) ?? str(item.degree),
    specialty_ar: typeof item.specialty_ar === "string" ? item.specialty_ar : undefined,
    specialty_en: typeof item.specialty_en === "string" ? item.specialty_en : undefined,
    experience_years: typeof item.experience_years === "number" ? item.experience_years : typeof item.years_experience === "number" ? item.years_experience : undefined,
    bio: typeof item.bio === "string" ? item.bio : undefined,
    services: Array.isArray(item.services)
      ? item.services.map((s: any) => ({
          id: String(s.id ?? s._id ?? ""),
          name: String(s.name_ar ?? s.name ?? s.name_en ?? ""),
          name_ar: typeof s.name_ar === "string" ? s.name_ar : undefined,
          name_en: typeof s.name_en === "string" ? s.name_en : undefined,
          price: typeof s.price === "number" ? s.price : undefined,
          duration: typeof s.duration === "string" ? s.duration : undefined,
        }))
      : [],
  };
}
