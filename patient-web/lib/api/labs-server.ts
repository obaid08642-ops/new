import { patientApiUrl } from "@/lib/api/upstream";
import { parseLabServiceId } from "./labs";
import { publicReadSignal } from "@/lib/api/public-timeout";
import { publicListRead } from "@/lib/api/last-good";

const allowedSortFlags = new Set(["highest_rated", "nearest", "lowest_price"]);
function validQuery(value: string | undefined) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 120 ? trimmed : undefined;
}

export async function getPublicLabPackage(packageId: string): Promise<Response | null> {
  if (!parseLabServiceId(packageId).success) throw new Error("invalid_lab_package_id");
  try {
    return await fetch(patientApiUrl(`/labs/packages/${encodeURIComponent(packageId)}`), { signal: publicReadSignal(),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function getPublicLabService(serviceId: string): Promise<Response | null> {
  if (!parseLabServiceId(serviceId).success) throw new Error("invalid_lab_service_id");
  try {
    return await fetch(patientApiUrl(`/labs/services/${encodeURIComponent(serviceId)}`), { signal: publicReadSignal(),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function getPublicLabServices(
  params: {
    /** with `page` the answer is { data, total, page, limit, total_pages }; without it the plain array */
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    homeOnly?: boolean;
    highestRated?: boolean;
    nearest?: boolean;
    lowestPrice?: boolean;
  } = {}
): Promise<Response | null> {
  const query = new URLSearchParams();
  if (params.page !== undefined && Number.isInteger(params.page) && params.page >= 1) {
    query.set("page", String(params.page));
    query.set("limit", String(params.limit !== undefined && Number.isInteger(params.limit) && params.limit >= 1 ? Math.min(params.limit, 100) : 20));
  }
  const category = validQuery(params.category);
  const search = validQuery(params.search);
  if (category) query.set("category", category);
  if (search) query.set("search", search);
  if (params.homeOnly) query.set("home_visit", "true");
  for (const [key, enabled] of [
    ["highest_rated", params.highestRated],
    ["nearest", params.nearest],
    ["lowest_price", params.lowestPrice],
  ] as const) {
    if (enabled && allowedSortFlags.has(key)) query.set(key, "true");
  }
  const path = `/labs/services${query.toString() ? `?${query.toString()}` : ""}`;
  return publicListRead(`labs:${path}`, () => fetch(patientApiUrl(path), { signal: publicReadSignal(),
    headers: { Accept: "application/json" },
    cache: "no-store",
  }));
}

export type LabDetail = {
  id: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  city?: string;
  address?: string;
  phone?: string;
  image?: string;
  rating?: number;
  rating_count: number;
  description?: string;
  home_visit?: boolean;
  /** Where the lab is and how many branches it has (the app's directions and branches rows), when the server sends them. */
  lat?: number;
  lng?: number;
  branches?: number;
  services?: Array<{
    id: string;
    name: string;
    name_ar?: string;
    name_en?: string;
    price?: number;
    sample_type?: string;
  }>;
};

export async function getPublicLab(labId: string): Promise<Response | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(labId)) throw new Error("invalid_lab_id");
  try {
    return await fetch(patientApiUrl(`/labs/${encodeURIComponent(labId)}`), { signal: publicReadSignal(),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export function extractLab(payload: unknown): LabDetail | null {
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
    address: typeof item.address === "string" ? item.address : undefined,
    phone: typeof item.phone === "string" ? item.phone : undefined,
    image: typeof item.image === "string" ? item.image : undefined,
    rating: typeof item.rating === "number" ? item.rating : undefined,
    rating_count: typeof item.rating_count === "number" ? item.rating_count : 0,
    description: typeof item.description === "string" ? item.description : undefined,
    home_visit: typeof item.home_visit === "boolean" ? item.home_visit : undefined,
    lat: typeof item.lat === "number" && Math.abs(item.lat) <= 90 ? item.lat : undefined,
    lng: typeof item.lng === "number" && Math.abs(item.lng) <= 180 ? item.lng : undefined,
    branches: typeof item.branches === "number" && Number.isInteger(item.branches) && item.branches > 0 ? item.branches : undefined,
    services: Array.isArray(item.services)
      ? item.services.map((s: any) => ({
          id: String(s.id ?? s._id ?? ""),
          name: String(s.name_ar ?? s.name ?? s.name_en ?? ""),
          name_ar: typeof s.name_ar === "string" ? s.name_ar : undefined,
          name_en: typeof s.name_en === "string" ? s.name_en : undefined,
          price: typeof s.price === "number" ? s.price : undefined,
          sample_type: typeof s.sample_type === "string" ? s.sample_type : undefined,
        }))
      : [],
  };
}
