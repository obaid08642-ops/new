/**
 * The address add flow (owner item 4, 2026-10-25): the answer of backend GET /geo/reverse (modules/geo/geo.service.ts
 * `ReverseResult`) and a small controller that asks for it ONCE after the map stops moving. No React in here, so the whole
 * flow (pin moved, debounce, fields filled, save) is tested with plain functions and fake timers.
 */
import type { AddressForm, AddressPoint } from "@/lib/account/address-form";

/** The wait after the map stops moving before the address is asked for (owner flow: about 600 ms). */
export const REVERSE_DEBOUNCE_MS = 600;

/** `city_id` / `district_id` are codes of OUR catalogue (always ours, or null); the rest is what the sources found. */
export type ReverseResult = {
  city_id: string | null;
  city_name_ar: string | null;
  city_name_en: string | null;
  district_id: string | null;
  district_name_ar: string | null;
  district_name_en: string | null;
  street: string | null;
  building_no: string | null;
  postal_code: string | null;
  short_address: string | null;
  source: "spl" | "osm";
};

export type ReverseFailure = "outside" | "notFound" | "unavailable" | "network";

export type ReverseState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; result: ReverseResult }
  | { status: "error"; reason: ReverseFailure };

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** The answer, read field by field; null when it is not an object. A field of another type is null, never trusted. */
export function parseReverse(payload: unknown): ReverseResult | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const r = payload as Record<string, unknown>;
  return {
    city_id: text(r.city_id),
    city_name_ar: text(r.city_name_ar),
    city_name_en: text(r.city_name_en),
    district_id: text(r.district_id),
    district_name_ar: text(r.district_name_ar),
    district_name_en: text(r.district_name_en),
    street: text(r.street),
    building_no: text(r.building_no),
    postal_code: text(r.postal_code),
    short_address: text(r.short_address),
    source: r.source === "spl" ? "spl" : "osm",
  };
}

/** backend: 400 outside_service_area, 404 address_not_found, 503 geo_unavailable (anything else is a failed call). */
export function failureFor(status: number): ReverseFailure {
  if (status === 400) return "outside";
  if (status === 404) return "notFound";
  return "unavailable";
}

export function reverseUrl(point: AddressPoint): string {
  return `/api/geo/reverse?lat=${encodeURIComponent(String(point.lat))}&lng=${encodeURIComponent(String(point.lng))}`;
}

export type ReverseController = {
  /** The pin moved: forget the pending ask, show "loading", and ask once the debounce has passed. */
  schedule: (point: AddressPoint) => void;
  /** Ask again for the last point now (the retry button). */
  retry: () => void;
  cancel: () => void;
};

export function createReverseController(options: {
  onState: (state: ReverseState) => void;
  fetchImpl?: typeof fetch;
  delayMs?: number;
}): ReverseController {
  const { onState, delayMs = REVERSE_DEBOUNCE_MS } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let abort: AbortController | null = null;
  let last: AddressPoint | null = null;
  let generation = 0;

  const stop = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    abort?.abort();
    abort = null;
    generation += 1;
  };

  async function ask(point: AddressPoint, mine: number) {
    const fetcher = options.fetchImpl ?? fetch;
    abort = new AbortController();
    try {
      const res = await fetcher(reverseUrl(point), { signal: abort.signal, credentials: "same-origin" });
      if (mine !== generation) return;
      if (!res.ok) return onState({ status: "error", reason: failureFor(res.status) });
      const result = parseReverse(await res.json().catch(() => null));
      if (mine !== generation) return;
      onState(result ? { status: "ok", result } : { status: "error", reason: "unavailable" });
    } catch {
      if (mine === generation) onState({ status: "error", reason: "network" });
    }
  }

  return {
    schedule(point) {
      stop();
      last = point;
      const mine = generation;
      onState({ status: "loading" });
      timer = setTimeout(() => { timer = null; void ask(point, mine); }, delayMs);
    },
    retry() {
      if (!last) return;
      const point = last;
      stop();
      const mine = generation;
      onState({ status: "loading" });
      void ask(point, mine);
    },
    cancel() {
      stop();
    },
  };
}

type FormKey = keyof AddressForm;

/**
 * What the answer puts into the form: city and district (our codes), the street (first line), the building number and the
 * short-address code. A field the patient has typed or picked ("touched") is never overwritten, and an empty answer never
 * clears a field.
 */
export function fillFromReverse(result: ReverseResult, touched: ReadonlySet<FormKey>): Partial<AddressForm> {
  const patch: Partial<AddressForm> = {};
  const put = (key: FormKey, value: string | null) => { if (value && !touched.has(key)) patch[key] = value; };
  put("city", result.city_id);
  put("district", result.district_id);
  put("line1", result.street);
  put("building", result.building_no);
  put("short_address", result.short_address);
  return patch;
}
