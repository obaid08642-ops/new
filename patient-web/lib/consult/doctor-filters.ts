/**
 * The doctors page's two quick filters, "Nearest" and "Available now", and the visit type they depend on. The state is in
 * the URL (so a filtered list can be shared) and is read on the server; GET /care/doctors (backend Q-12 / Q-13) answers:
 *
 *   Nearest        -> sort=distance&lat=&lng= (the browser location, asked only when the patient taps the control);
 *                     without a position the saved address city is sent as `city`. Clinic and home visit only: the
 *                     server rejects it for video.
 *   Available now  -> available_within=15 (whole minutes) with `type` (required by the server). The server orders by the
 *                     earliest free slot; with "Nearest" too (clinic and home visit) the position is sent and the free
 *                     doctors come nearest first (2-web#10).
 *
 * The same rules and the same 15 minutes as the app (patient-app/src/utils/consultNearby.ts).
 */

export const AVAILABLE_WITHIN_MINUTES = 15;
export const VISIT_TYPES = ["clinic", "video", "home_visit"] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export type NearbyPlace = { kind: "coords"; lat: number; lng: number } | { kind: "city"; city: string };

/**
 * Who pays, chosen first (decision 30; owner 2026-10-14 question 28 replaced the old "Cash only" = `accepts_insurance=false`):
 *   insurance -> with the patient's saved policy, only the doctors contracted for that company and class
 *                (`insurance=<company id>&insurance_class=<class>`, the D-30 list contract); without a saved policy (a guest,
 *                or no policy yet) the doctors who accept insurance (`accepts_insurance=true`);
 *   self_pay  -> every doctor (a patient who pays can book anyone; the list is unchanged).
 * An old shared link with `payment=cash` reads as self-pay.
 */
export const PAYMENT_FILTERS = ["insurance", "self_pay"] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

/** The patient's saved insurer (GET /users/me/insurance). It travels in the page URL (`insurance`, `insurance_class`), filled in
 *  by the browser from the saved policy, so the doctors page itself never reads the session (static/cached page rule). */
export type Insurer = { company: string; class?: string };

/** The academic degrees GET /care/doctors?degree= knows (GET /care/degrees: the backend AcademicDegree slugs). */
export const DEGREES = ["professor", "consultant", "senior_specialist", "specialist", "resident", "general_practitioner"] as const;
export type Degree = (typeof DEGREES)[number];

export type DoctorFilters = {
  type?: VisitType;
  /** The doctor's grade (`degree`). */
  degree?: Degree;
  payment?: PaymentFilter;
  /** Only with payment "insurance": the saved policy's company and class, from the page URL. */
  insurer?: Insurer;
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
  const rawDegree = first(raw.degree);
  const degree = (DEGREES as readonly string[]).includes(rawDegree ?? "") ? (rawDegree as Degree) : undefined;
  const rawPayment = first(raw.payment) === "cash" ? "self_pay" : first(raw.payment);
  const payment = (PAYMENT_FILTERS as readonly string[]).includes(rawPayment ?? "") ? (rawPayment as PaymentFilter) : undefined;
  const company = payment === "insurance" ? boundedText(first(raw.insurance)) : undefined;
  const insurerClass = company ? boundedText(first(raw.insurance_class)) : undefined;
  const insurer: Insurer | undefined = company ? (insurerClass ? { company, class: insurerClass } : { company }) : undefined;
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
  return { type, ...(degree ? { degree } : {}), ...(payment ? { payment } : {}), ...(insurer ? { insurer } : {}), availableNow, nearest: nearest && place !== null, place };
}

/** "Available now" needs a visit type; without a chosen one the clinic is the default (and is shown as chosen). */
export const effectiveType = (filters: Pick<DoctorFilters, "type" | "availableNow">): VisitType | undefined =>
  filters.type ?? (filters.availableNow ? "clinic" : undefined);

/** The query params (without q / sort) the filters add to GET /care/doctors. */
export function filterApiParams(filters: DoctorFilters): Array<[string, string]> {
  const type = effectiveType(filters);
  const out: Array<[string, string]> = [];
  if (type) out.push(["type", type]);
  if (filters.degree) out.push(["degree", filters.degree]);
  if (filters.payment === "insurance") {
    if (filters.insurer) {
      out.push(["insurance", filters.insurer.company]);
      if (filters.insurer.class) out.push(["insurance_class", filters.insurer.class]);
    } else out.push(["accepts_insurance", "true"]);
  }
  if (filters.availableNow) out.push(["available_within", String(AVAILABLE_WITHIN_MINUTES)]);
  if (filters.nearest && filters.place && nearestApplies(type)) {
    if (filters.place.kind === "coords") {
      out.push(["sort", "distance"], ["lat", String(filters.place.lat)], ["lng", String(filters.place.lng)]);
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
  if (filters.degree) params.set("degree", filters.degree);
  if (filters.payment) params.set("payment", filters.payment);
  if (filters.payment === "insurance" && filters.insurer) {
    params.set("insurance", filters.insurer.company);
    if (filters.insurer.class) params.set("insurance_class", filters.insurer.class);
  }
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

/** The insurer of a saved policy (GET /users/me/insurance): the company id (add-policy save) or provider, and the class. */
export function insurerOf(policy: unknown): Insurer | undefined {
  if (!policy || typeof policy !== "object") return undefined;
  const p = policy as Record<string, unknown>;
  const company = boundedText(p.company_id) ?? boundedText(p.provider);
  if (!company) return undefined;
  const cls = boundedText(p.class) ?? boundedText(p.plan_class);
  return cls ? { company, class: cls } : { company };
}

function boundedText(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 128) : undefined;
}
