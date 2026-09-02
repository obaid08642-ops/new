import { patientApiUrl } from "@/lib/api/upstream";

export type Clinic = {
  id: string;
  name: string;
  name_ar?: string;
  city?: string;
  address?: string;
  phone?: string;
  image?: string;
  rating?: number;
  description?: string;
  description_ar?: string;
  description_en?: string;
  doctors?: Array<{
    id: string;
    name?: string;
    name_ar?: string;
    specialty?: string;
    specialty_ar?: string;
    avatar?: string;
  }>;
};

export async function getPublicClinic(clinicId: string): Promise<Response | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(clinicId)) throw new Error("invalid_clinic_id");
  try {
    return await fetch(patientApiUrl(`/care/facilities/${encodeURIComponent(clinicId)}`), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export function extractClinic(payload: unknown): Clinic | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = (payload as { data?: unknown }).data ?? payload;
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const id = String(c.id ?? c._id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(c.name_ar ?? c.name ?? ""),
    name_ar: typeof c.name_ar === "string" ? c.name_ar : undefined,
    city: typeof c.city === "string" ? c.city : undefined,
    address: typeof c.address === "string" ? c.address : undefined,
    phone: typeof c.phone === "string" ? c.phone : undefined,
    image: typeof c.image === "string" ? c.image : undefined,
    rating: typeof c.rating === "number" ? c.rating : 4.9,
    description: typeof c.description === "string" ? c.description : undefined,
    description_ar: typeof c.description_ar === "string" ? c.description_ar : undefined,
    description_en: typeof c.description_en === "string" ? c.description_en : undefined,
    doctors: Array.isArray(c.doctors)
      ? c.doctors.map((d: any) => ({
          id: String(d.id ?? d._id ?? ""),
          name: typeof d.name === "string" ? d.name : undefined,
          name_ar: typeof d.name_ar === "string" ? d.name_ar : undefined,
          specialty: typeof d.specialty === "string" ? d.specialty : undefined,
          specialty_ar: typeof d.specialty_ar === "string" ? d.specialty_ar : undefined,
          avatar: typeof d.avatar === "string" ? d.avatar : undefined,
        }))
      : [],
  };
}
