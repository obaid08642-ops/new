import { afterEach, describe, expect, it, vi } from "vitest";
import { currentPosition, geolocationPermission } from "./explorer-browser";
import { browserCoords, resolveNearbyPlace } from "../consult/doctor-filters-browser";

/** PT-30 on the web: the location permission is refused (or the browser has none): no coordinates, no dead end, the saved city is the fallback. */
afterEach(() => vi.unstubAllGlobals());

const geo = (answer: "denied" | "granted" | "unavailable") => ({
  getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number } }) => void, fail: (e: { code: number }) => void) => {
    if (answer === "granted") ok({ coords: { latitude: 24.7, longitude: 46.7 } });
    else fail({ code: answer === "denied" ? 1 : 2 });
  },
});

describe("the location permission is refused (PT-30, web)", () => {
  it("the map asks only when granted: a refused permission is reported as denied, and a browser without the Permissions API as prompt", async () => {
    vi.stubGlobal("navigator", { permissions: { query: async () => ({ state: "denied" }) } });
    expect(await geolocationPermission()).toBe("denied");
    vi.stubGlobal("navigator", {});
    expect(await geolocationPermission()).toBe("prompt");
  });

  it("the map position is null when the user refuses, when it is unavailable and when the browser has no geolocation; a granted one is the point", async () => {
    vi.stubGlobal("navigator", { geolocation: geo("denied") });
    expect(await currentPosition()).toBeNull();
    vi.stubGlobal("navigator", { geolocation: geo("unavailable") });
    expect(await currentPosition()).toBeNull();
    vi.stubGlobal("navigator", {});
    expect(await currentPosition()).toBeNull();
    vi.stubGlobal("navigator", { geolocation: geo("granted") });
    expect(await currentPosition()).toEqual({ lat: 24.7, lng: 46.7 });
  });

  it("the doctors list's 'Nearest' gets no coordinates when refused and falls back to the saved city; with neither there is no place", async () => {
    vi.stubGlobal("navigator", { geolocation: geo("denied") });
    expect(await browserCoords()).toBeNull();
    const refused = { deviceCoords: async () => null, savedCity: async () => "  Riyadh " };
    expect(await resolveNearbyPlace(refused)).toEqual({ kind: "city", city: "Riyadh" });
    expect(await resolveNearbyPlace({ deviceCoords: async () => null, savedCity: async () => undefined })).toBeNull();
    expect(await resolveNearbyPlace({ deviceCoords: async () => { throw new Error("denied"); }, savedCity: async () => "Jeddah" })).toEqual({ kind: "city", city: "Jeddah" });
  });

  it("a coordinate outside the earth is never used as a place", async () => {
    expect(await resolveNearbyPlace({ deviceCoords: async () => ({ lat: 999, lng: 10 }), savedCity: async () => "Riyadh" })).toEqual({ kind: "city", city: "Riyadh" });
  });
});
