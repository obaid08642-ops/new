import { describe, expect, it } from "vitest";
import { DEFAULT_CENTRE, distanceFrom, filterProviders, haversineKm, locatable, mapPhase, nearestToCentre, resolveCentre, sortNearest, type MapRow } from "./explorer-model";

const row = (id: string, type: string, lat?: number, lng?: number, specialty?: string): MapRow => ({ id, type, name: `n-${id}`, lat, lng, specialty });
const rows = [row("a", "doctor", 24.71, 46.67, "Cardiology"), row("b", "pharmacy", 24.8, 46.7), row("c", "doctor"), row("d", "lab", 24.72, 46.68)];

describe("providers map rules", () => {
  it("filters by type and by text in the name or the specialty", () => {
    expect(filterProviders(rows, "all", "").map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
    expect(filterProviders(rows, "doctor", "").map((r) => r.id)).toEqual(["a", "c"]);
    expect(filterProviders(rows, "all", " CARDIO ").map((r) => r.id)).toEqual(["a"]);
    expect(filterProviders(rows, "lab", "cardio")).toEqual([]);
  });

  it("measures the distance and orders nearest first, positionless last", () => {
    expect(haversineKm({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeGreaterThan(110);
    expect(distanceFrom(DEFAULT_CENTRE, row("c", "doctor"))).toBeNull();
    expect(sortNearest(rows, { lat: 24.8, lng: 46.7 }).map((r) => r.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("keeps only providers with a position as pins", () => {
    expect(locatable(rows).map((r) => r.id)).toEqual(["a", "b", "d"]);
  });

  it("picks the card nearest the middle, the same in a right-to-left row", () => {
    const viewport = { x: 0, width: 400 };
    const ltr = [{ id: "a", x: 16, width: 280 }, { id: "b", x: 308, width: 280 }];
    expect(nearestToCentre(ltr, viewport)).toBe("a");
    expect(nearestToCentre([{ id: "a", x: -200, width: 280 }, { id: "b", x: 112, width: 280 }], viewport)).toBe("b");
    // right-to-left: the first card sits at the right edge
    const rtl = [{ id: "a", x: 104, width: 280 }, { id: "b", x: -188, width: 280 }];
    expect(nearestToCentre(rtl, viewport)).toBe("a");
    expect(nearestToCentre([], viewport)).toBeNull();
  });

  it("centres on the position, else the saved address, else the default; never asks while the permission is not granted", async () => {
    const me = { lat: 1, lng: 2 };
    const home = { lat: 3, lng: 4 };
    let asked = 0;
    const position = async () => { asked++; return me; };
    expect(await resolveCentre({ permission: async () => "granted", position, saved: async () => home })).toEqual({ point: me, source: "me" });
    asked = 0;
    expect(await resolveCentre({ permission: async () => "denied", position, saved: async () => home })).toEqual({ point: home, source: "saved" });
    expect(await resolveCentre({ permission: async () => "prompt", position, saved: async () => home })).toEqual({ point: home, source: "saved" });
    expect(asked).toBe(0);
    expect(await resolveCentre({ permission: async () => "denied", position, saved: async () => null })).toEqual({ point: DEFAULT_CENTRE, source: "default" });
    expect(await resolveCentre({ permission: async () => { throw new Error("x"); }, position, saved: async () => { throw new Error("401"); } })).toEqual({ point: DEFAULT_CENTRE, source: "default" });
    expect(await resolveCentre({ permission: async () => "granted", position: async () => null, saved: async () => home })).toEqual({ point: home, source: "saved" });
  });

  it("names the page state", () => {
    expect(mapPhase({ loading: true, failed: false, total: 0, shown: 0, filtered: false })).toBe("loading");
    expect(mapPhase({ loading: false, failed: true, total: 0, shown: 0, filtered: false })).toBe("failed");
    expect(mapPhase({ loading: false, failed: false, total: 0, shown: 0, filtered: false })).toBe("empty");
    expect(mapPhase({ loading: false, failed: false, total: 3, shown: 0, filtered: true })).toBe("emptyFiltered");
    expect(mapPhase({ loading: false, failed: false, total: 3, shown: 2, filtered: true })).toBe("ready");
  });
});
