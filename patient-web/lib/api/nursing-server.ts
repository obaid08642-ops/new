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
    avatar: typeof item.avatar === "string" ? item.avatar : undefined,
    rating: typeof item.rating === "number" ? item.rating : 4.9,
    specialty: String(item.specialty_ar ?? item.specialty ?? item.specialty_en ?? "تمريض عام ورعاية منزلية"),
    specialty_ar: typeof item.specialty_ar === "string" ? item.specialty_ar : undefined,
    specialty_en: typeof item.specialty_en === "string" ? item.specialty_en : undefined,
    experience_years: typeof item.experience_years === "number" ? item.experience_years : 5,
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
