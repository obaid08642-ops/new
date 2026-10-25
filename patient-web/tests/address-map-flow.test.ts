import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_ADDRESS_FORM, buildCreateBody, type AddressForm } from "../lib/account/address-form";
import { REVERSE_DEBOUNCE_MS, createReverseController, failureFor, fillFromReverse, parseReverse, reverseUrl, type ReverseState } from "../lib/geo/reverse";
import { formatPoint, nudgeFor, webglAvailable } from "../lib/geo/map";
import { isAllowedPatientApiTarget } from "../lib/api/patient-allowlist";

const answer = {
  city_id: "riyadh", city_name_ar: "الرياض", city_name_en: "Riyadh", district_id: "olaya", district_name_ar: "العليا", district_name_en: "Olaya",
  street: "King Fahd Rd", building_no: "7421", postal_code: "12214", short_address: "RRRD2929", source: "spl",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** The flow of AddAddressForm without React: the controller reports into `states`, an answer fills the form, save builds the POST. */
function flow(fetchImpl: typeof fetch) {
  const states: ReverseState[] = [];
  let form: AddressForm = { ...EMPTY_ADDRESS_FORM, label: "Home" };
  const touched = new Set<keyof AddressForm>();
  const controller = createReverseController({
    fetchImpl,
    onState: (state) => {
      states.push(state);
      if (state.status === "ok") form = { ...form, ...fillFromReverse(state.result, touched) };
    },
  });
  return { controller, states, get form() { return form; }, touch(patch: Partial<AddressForm>) { for (const k of Object.keys(patch) as Array<keyof AddressForm>) touched.add(k); form = { ...form, ...patch }; } };
}

describe("address add flow: map pin -> reverse -> fields -> save", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("asks GET /api/geo/reverse once, 600 ms after the last move, fills the fields, and the save posts them with lat/lng", async () => {
    const fetchImpl = vi.fn(async () => json(answer));
    const f = flow(fetchImpl as unknown as typeof fetch);
    f.controller.schedule({ lat: 24.7, lng: 46.6 });
    await vi.advanceTimersByTimeAsync(REVERSE_DEBOUNCE_MS - 1);
    expect(fetchImpl).not.toHaveBeenCalled();
    f.controller.schedule({ lat: 24.71, lng: 46.61 }); // moved again: the first ask is forgotten
    await vi.advanceTimersByTimeAsync(REVERSE_DEBOUNCE_MS - 1);
    expect(fetchImpl).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe("/api/geo/reverse?lat=24.71&lng=46.61");
    expect(f.states.map((s) => s.status)).toEqual(["loading", "loading", "ok"]);
    expect(f.form).toMatchObject({ label: "Home", city: "riyadh", district: "olaya", line1: "King Fahd Rd", building: "7421", short_address: "RRRD2929" });

    // save: POST /users/me/addresses with those fields and the pin
    const body = buildCreateBody({ ...f.form, floor: "3", notes: "Blue door" }, { lat: 24.71, lng: 46.61 });
    expect(body).toMatchObject({ label: "Home", line1: "King Fahd Rd", building: "7421", floor: "3", notes: "Blue door", city: "riyadh", district: "olaya", short_address: "RRRD2929", lat: 24.71, lng: 46.61 });
    expect(buildCreateBody(f.form, null)).not.toHaveProperty("lat");
  });

  it("never overwrites what the patient typed or picked, and an empty answer clears nothing", async () => {
    const f = flow((async () => json({ ...answer, street: null, district_id: null })) as unknown as typeof fetch);
    f.touch({ city: "jeddah", building: "9" });
    f.controller.schedule({ lat: 24.7, lng: 46.6 });
    await vi.advanceTimersByTimeAsync(REVERSE_DEBOUNCE_MS);
    expect(f.form).toMatchObject({ city: "jeddah", building: "9", district: "", line1: "", short_address: "RRRD2929" });
  });

  it("reverse error: the state says why, the form is untouched, and retry asks again at once", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({ message: "geo_unavailable" }, 503)).mockResolvedValueOnce(json(answer));
    const f = flow(fetchImpl as unknown as typeof fetch);
    f.controller.schedule({ lat: 24.7, lng: 46.6 });
    await vi.advanceTimersByTimeAsync(REVERSE_DEBOUNCE_MS);
    expect(f.states.at(-1)).toEqual({ status: "error", reason: "unavailable" });
    expect(f.form).toEqual({ ...EMPTY_ADDRESS_FORM, label: "Home" });
    f.controller.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(f.states.at(-1)?.status).toBe("ok");
  });

  it("offline: a thrown fetch is the network error; outside the kingdom and not-found are told apart", async () => {
    const f = flow((async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch);
    f.controller.schedule({ lat: 24.7, lng: 46.6 });
    await vi.advanceTimersByTimeAsync(REVERSE_DEBOUNCE_MS);
    expect(f.states.at(-1)).toEqual({ status: "error", reason: "network" });
    expect([failureFor(400), failureFor(404), failureFor(503), failureFor(500)]).toEqual(["outside", "notFound", "unavailable", "unavailable"]);
  });

  it("a late answer for an old pin is dropped", async () => {
    let release!: (r: Response) => void;
    const slow = new Promise<Response>((resolve) => { release = resolve; });
    const fetchImpl = vi.fn().mockReturnValueOnce(slow).mockResolvedValueOnce(json({ ...answer, street: "New St" }));
    const f = flow(fetchImpl as unknown as typeof fetch);
    f.controller.schedule({ lat: 24.7, lng: 46.6 });
    await vi.advanceTimersByTimeAsync(REVERSE_DEBOUNCE_MS);
    f.controller.schedule({ lat: 24.8, lng: 46.7 });
    release(json({ ...answer, street: "Old St" }));
    await vi.advanceTimersByTimeAsync(REVERSE_DEBOUNCE_MS);
    expect(f.form.line1).toBe("New St");
  });
});

describe("the reverse answer, the keyboard and the browser checks", () => {
  it("reads the backend answer field by field", () => {
    expect(parseReverse(answer)).toMatchObject({ city_id: "riyadh", district_id: "olaya", source: "spl" });
    expect(parseReverse({ city_id: 5, street: "  " })).toMatchObject({ city_id: null, street: null, source: "osm" });
    expect(parseReverse(null)).toBeNull();
    expect(parseReverse([])).toBeNull();
    expect(reverseUrl({ lat: 24.5, lng: -1 })).toBe("/api/geo/reverse?lat=24.5&lng=-1");
  });

  it("arrow keys nudge the pin (Shift: five times as far), + and - zoom, other keys do nothing", () => {
    expect(nudgeFor("ArrowRight")).toEqual({ kind: "pan", dx: 40, dy: 0 });
    expect(nudgeFor("ArrowUp", true)).toEqual({ kind: "pan", dx: 0, dy: -200 });
    expect(nudgeFor("+")).toEqual({ kind: "zoom", delta: 1 });
    expect(nudgeFor("-")).toEqual({ kind: "zoom", delta: -1 });
    expect(nudgeFor("a")).toBeNull();
  });

  it("no WebGL means no map: without a document, with a canvas that gives no context, or that throws", () => {
    expect(webglAvailable(undefined)).toBe(false);
    expect(webglAvailable({ createElement: () => ({ getContext: () => null }) } as unknown as Document)).toBe(false);
    expect(webglAvailable({ createElement: () => ({ getContext: () => { throw new Error("blocked"); } }) } as unknown as Document)).toBe(false);
    expect(webglAvailable({ createElement: () => ({ getContext: (kind: string) => (kind === "webgl" ? {} : null) }) } as unknown as Document)).toBe(true);
    expect(formatPoint({ lat: 24.7136, lng: 46.6753 }, "en")).toBe("24.71360, 46.67530");
  });

  it("GET /geo/reverse is on the allowlist for numbers only", () => {
    expect(isAllowedPatientApiTarget("/geo/reverse", "?lat=24.7&lng=46.6", "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/geo/reverse", "?lat=24.7&lng=46.6&x=1", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/geo/reverse", "?lat=a&lng=b", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/geo/reverse", "?lat=24.7&lng=46.6", "POST")).toBe(false);
  });
});
