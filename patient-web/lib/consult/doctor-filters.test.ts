import { describe, expect, it, vi } from "vitest";
import { doctorQuery } from "@/lib/api/doctors";
import {
  AVAILABLE_WITHIN_MINUTES, effectiveType, filterApiParams, filterPageParams, parseDoctorFilters, resolveNearbyPlace, savedAddressCity, serverOrdersList,
} from "./doctor-filters";

const coords = { kind: "coords", lat: 24.7136, lng: 46.6753 } as const;

describe("doctor filters: reading the URL", () => {
  it("keeps only known values", () => {
    expect(parseDoctorFilters({ type: "dentist", available: "yes", nearest: "1" })).toEqual({ type: undefined, availableNow: false, nearest: false, place: null });
    expect(parseDoctorFilters({ type: "home_visit", available: "1" })).toMatchObject({ type: "home_visit", availableNow: true });
  });
  it("nearest needs a place: coordinates in range, else a city", () => {
    expect(parseDoctorFilters({ nearest: "1", lat: "24.7136", lng: "46.6753" })).toMatchObject({ nearest: true, place: coords });
    expect(parseDoctorFilters({ nearest: "1", lat: "124", lng: "46" })).toMatchObject({ nearest: false, place: null });
    expect(parseDoctorFilters({ nearest: "1", lat: "abc", lng: "46", city: " Jeddah " })).toMatchObject({ nearest: true, place: { kind: "city", city: "Jeddah" } });
    expect(parseDoctorFilters({ nearest: "1" })).toMatchObject({ nearest: false });
  });
  it("nearest is never on for video", () => {
    expect(parseDoctorFilters({ type: "video", nearest: "1", lat: "24.7", lng: "46.6" })).toMatchObject({ nearest: false, place: null });
  });
  it("available now without a type shows the clinic", () => {
    expect(effectiveType(parseDoctorFilters({ available: "1" }))).toBe("clinic");
    expect(effectiveType(parseDoctorFilters({}))).toBeUndefined();
  });
});

describe("doctor filters: the GET /care/doctors query", () => {
  it("no filter: the unchanged query", () => {
    expect(doctorQuery({ search: "heart", sort: "rating" })).toBe("/care/doctors?q=heart&sort=rating");
    expect(doctorQuery({ specialty: "Cardiology", sort: "rating", filters: parseDoctorFilters({}) })).toBe("/care/doctors?q=Cardiology&sort=rating");
  });
  it("nearest with the position: sort=distance with lat and lng and the type", () => {
    const filters = parseDoctorFilters({ type: "clinic", nearest: "1", lat: "24.7136", lng: "46.6753" });
    expect(doctorQuery({ sort: "price", filters })).toBe("/care/doctors?type=clinic&sort=distance&lat=24.7136&lng=46.6753");
    expect(serverOrdersList(filters)).toBe(true);
  });
  it("nearest by the saved city: the city filter, the page's own sort stays", () => {
    const filters = parseDoctorFilters({ nearest: "1", city: "Jeddah" });
    expect(doctorQuery({ sort: "price", filters })).toBe("/care/doctors?sort=price&city=Jeddah");
    expect(serverOrdersList(filters)).toBe(false);
  });
  it("available now: 15 whole minutes with the type the server requires", () => {
    expect(AVAILABLE_WITHIN_MINUTES).toBe(15);
    expect(doctorQuery({ filters: parseDoctorFilters({ available: "1" }) })).toBe("/care/doctors?type=clinic&available_within=15");
    expect(doctorQuery({ sort: "wait", filters: parseDoctorFilters({ available: "1", type: "video" }) })).toBe("/care/doctors?type=video&available_within=15");
  });
  it("available now with nearest: no distance sort (the server cannot combine them); the city is still sent", () => {
    expect(filterApiParams(parseDoctorFilters({ available: "1", nearest: "1", lat: "24.7", lng: "46.6" })).map(([k]) => k)).toEqual(["type", "available_within"]);
    expect(doctorQuery({ filters: parseDoctorFilters({ available: "1", nearest: "1", city: "Jeddah" }) })).toBe("/care/doctors?type=clinic&available_within=15&city=Jeddah");
  });
  it("text search is q, never search", () => {
    expect(doctorQuery({ search: "heart", filters: parseDoctorFilters({ available: "1" }) })).toBe("/care/doctors?q=heart&type=clinic&available_within=15");
  });
});

describe("doctor filters: the page URL", () => {
  it("round-trips through the URL and keeps q", () => {
    const filters = parseDoctorFilters({ type: "home_visit", available: "1", nearest: "1", city: "Jeddah" });
    const params = filterPageParams(filters, { q: "heart", sort: "rating" });
    expect(params.toString()).toBe("q=heart&sort=rating&type=home_visit&available=1&nearest=1&city=Jeddah");
    expect(parseDoctorFilters(Object.fromEntries(params))).toEqual(filters);
  });
});

describe("doctor filters: where nearest measures from", () => {
  const deps = (over: Partial<Parameters<typeof resolveNearbyPlace>[0]>) => ({ deviceCoords: async () => null, savedCity: async () => undefined, ...over });
  it("location granted: the coordinates", async () => {
    expect(await resolveNearbyPlace(deps({ deviceCoords: async () => ({ lat: 24.7, lng: 46.6 }) }))).toEqual({ kind: "coords", lat: 24.7, lng: 46.6 });
  });
  it("denied, failing or out of range: the saved city", async () => {
    expect(await resolveNearbyPlace(deps({ savedCity: async () => " Jeddah " }))).toEqual({ kind: "city", city: "Jeddah" });
    expect(await resolveNearbyPlace(deps({ deviceCoords: async () => { throw new Error("x"); }, savedCity: async () => "Jeddah" }))).toEqual({ kind: "city", city: "Jeddah" });
    expect(await resolveNearbyPlace(deps({ deviceCoords: async () => ({ lat: 124, lng: 46 }), savedCity: async () => "Jeddah" }))).toEqual({ kind: "city", city: "Jeddah" });
  });
  it("neither: null", async () => {
    expect(await resolveNearbyPlace(deps({}))).toBeNull();
    expect(await resolveNearbyPlace(deps({ savedCity: async () => { throw new Error("401"); } }))).toBeNull();
  });
});

describe("doctor filters: the saved address city", () => {
  const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  it("takes the default address city, else the first with a city", async () => {
    expect(await savedAddressCity(reply(200, [{ id: "a", city: "Riyadh" }, { id: "b", city: "Jeddah", is_default: true }]))).toBe("Jeddah");
    expect(await savedAddressCity(reply(200, [{ id: "a" }, { id: "b", city: "Riyadh" }]))).toBe("Riyadh");
  });
  it("signed out or failing: no city", async () => {
    expect(await savedAddressCity(reply(401, {}))).toBeUndefined();
    expect(await savedAddressCity(reply(200, []))).toBeUndefined();
  });
});
