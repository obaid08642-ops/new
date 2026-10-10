/**
 * The doctors page's two quick filters, "Nearest" and "Available now", and the visit type they depend on. The state is in
 * the URL (so a filtered list can be shared) and is read on the server; GET /care/doctors (backend Q-12 / Q-13) answers:
 *
 *   Nearest        -> sort=distance&lat=&lng= (the browser location, asked only when the patient taps the control);
 *                     without a position the saved address city is sent as `city`. Clinic and home visit only: the
 *                     server rejects it for video.
 *   Available now  -> available_within=15 (whole minutes) with `type` (required by the server). The server orders by the
 *                     earliest free slot and does not combine it with a distance order, so with both on the position is
 *                     not sent (the city filter still is).
 *
 * The same rules and the same 15 minutes as the app (patient-app/src/utils/consultNearby.ts).
 */
import { parseDeliveryAddresses } from "@/lib/pharmacy/delivery-address";

export const AVAILABLE_WITHIN_MINUTES = 15;
export const VISIT_TYPES = ["clinic", "video", "home_visit"] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export type NearbyPlace = { kind: "coords"; lat: number; lng: number } | { kind: "city"; city: string };

/** Who pays: "insurance" = doctors who accept insurance (`accepts_insurance=true`); "cash" = doctors who do not, so the visit is paid in cash (`accepts_insurance=false`). */
export const PAYMENT_FILTERS = ["insurance", "cash"] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

export type DoctorFilters = {
  type?: VisitType;
  payment?: PaymentFilter;
  availableNow: boolean;
  nearest: boolean;
  place: NearbyPlace | null;
};

type Raw = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** "Nearest" is for a doctor the patient goes to, or who comes to the patient: never video. */
export const nearestApplies = (type: VisitType | undefined): boolean => type !== "video";

function numberParam(value: string | undefined, limit: number): number | null {
  if (value === undefined || !/^-?\d{1,3}(\.\d{1,10})?$/.test(value.trim())) return null;
  const n = Number(value);
  return finite(n) && Math.abs(n) <= limit ? n : null;
}

/** Reads the filters from the page's query; anything unknown or out of range is dropped, never guessed. */
export function parseDoctorFilters(raw: Raw): DoctorFilters {
  const rawType = first(raw.type);
  const type = (VISIT_TYPES as readonly string[]).includes(rawType ?? "") ? (rawType as VisitType) : undefined;
  const rawPayment = first(raw.payment);
  const payment = (PAYMENT_FILTERS as readonly string[]).includes(rawPayment ?? "") ? (rawPayment as PaymentFilter) : undefined;
  const availableNow = first(raw.available) === "1";
  const nearest = first(raw.nearest) === "1" && nearestApplies(type ?? (availableNow ? "clinic" : undefined));
  let place: NearbyPlace | null = null;
  if (nearest) {
    const lat = numberParam(first(raw.lat), 90);
    const lng = numberParam(first(raw.lng), 180);
    const city = first(raw.city)?.trim().slice(0, 80);
    if (lat !== null && lng !== null) place = { kind: "coords", lat, lng };
    else if (city) place = { kind: "city", city };
  }
  return { type, ...(payment ? { payment } : {}), availableNow, nearest: nearest && place !== null, place };
}

/** "Available now" needs a visit type; without a chosen one the clinic is the default (and is shown as chosen). */
export const effectiveType = (filters: Pick<DoctorFilters, "type" | "availableNow">): VisitType | undefined =>
  filters.type ?? (filters.availableNow ? "clinic" : undefined);

/** The query params (without q / sort) the filters add to GET /care/doctors. */
export function filterApiParams(filters: DoctorFilters): Array<[string, string]> {
  const type = effectiveType(filters);
  const out: Array<[string, string]> = [];
  if (type) out.push(["type", type]);
  if (filters.payment) out.push(["accepts_insurance", filters.payment === "insurance" ? "true" : "false"]);
  if (filters.availableNow) out.push(["available_within", String(AVAILABLE_WITHIN_MINUTES)]);
  if (filters.nearest && filters.place && nearestApplies(type)) {
    if (filters.place.kind === "coords") {
      if (!filters.availableNow) out.push(["sort", "distance"], ["lat", String(filters.place.lat)], ["lng", String(filters.place.lng)]);
    } else {
      out.push(["city", filters.place.city]);
    }
  }
  return out;
}

/** True when the server decides the order (distance or earliest slot), so the page's own sort choice does not apply. */
export const serverOrdersList = (filters: DoctorFilters): boolean => filters.availableNow || (filters.nearest && filters.place?.kind === "coords");

/** The page query (the URL the patient sees and shares) for a set of filters, plus the text search and sort. */
export function filterPageParams(filters: DoctorFilters, extra: { q?: string; specialty?: string; sort?: string } = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (extra.q) params.set("q", extra.q);
  if (extra.specialty) params.set("specialty", extra.specialty);
  if (extra.sort) params.set("sort", extra.sort);
  if (filters.type) params.set("type", filters.type);
  if (filters.payment) params.set("payment", filters.payment);
  if (filters.availableNow) params.set("available", "1");
  if (filters.nearest && filters.place) {
    params.set("nearest", "1");
    if (filters.place.kind === "coords") {
      params.set("lat", String(filters.place.lat));
      params.set("lng", String(filters.place.lng));
    } else {
      params.set("city", filters.place.city);
    }
  }
  return params;
}

export type PlaceDeps = {
  /** The browser position, or null when it is denied, timed out or not supported. */
  deviceCoords: () => Promise<{ lat: number; lng: number } | null>;
  /** The city of the saved address, if the patient is signed in and has one. */
  savedCity: () => Promise<string | undefined>;
};

/** Where "Nearest" measures from: the device position, else the saved address city, else null. Nothing is invented. */
export async function resolveNearbyPlace(deps: PlaceDeps): Promise<NearbyPlace | null> {
  try {
    const here = await deps.deviceCoords();
    if (here && finite(here.lat) && finite(here.lng) && Math.abs(here.lat) <= 90 && Math.abs(here.lng) <= 180) return { kind: "coords", lat: here.lat, lng: here.lng };
  } catch {
    // denied or unavailable: fall through to the city
  }
  try {
    const city = (await deps.savedCity())?.trim();
    if (city) return { kind: "city", city: city.slice(0, 80) };
  } catch {
    // no saved address readable: no place
  }
  return null;
}

/** The browser position, asked at call time (never on load). */
export function browserCoords(timeoutMs = 8000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/** The city of the default saved address (else the first one with a city), read through the patient proxy. */
export async function savedAddressCity(doFetch: typeof fetch = fetch): Promise<string | undefined> {
  const response = await doFetch("/api/patient/users/me/addresses", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return undefined;
  const list = parseDeliveryAddresses(await response.json().catch(() => null));
  return (list.find((a) => a.isDefault && a.city) ?? list.find((a) => a.city))?.city ?? undefined;
}
