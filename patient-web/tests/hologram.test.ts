import { describe, expect, it } from "vitest";
import { SERVICE_ICONS } from "../components-next/ui-generated/icons/fill";
import { HOLO_CLUSTER, HOLO_KINDS, HOLO_STYLE, holoFeatures, holoKind, holoMotion, holoShape, holoTone } from "../lib/map/hologram";

describe("hologram pin helpers", () => {
  it("every kind has a tone, a glyph and a shape; the first app map's shapes are kept", () => {
    for (const k of HOLO_KINDS) expect(HOLO_STYLE[k].tone && HOLO_STYLE[k].icon && HOLO_STYLE[k].shape).toBeTruthy();
    expect(holoShape("hospital")).toBe("square");
    expect(holoShape("pharmacy")).toBe("rect");
    expect(holoTone("pharmacy")).toBe(SERVICE_ICONS.pharmacy.tone);
    expect(holoTone("hospital")).toBe(SERVICE_ICONS.radiology.tone);
  });
  it("an unknown kind draws as a doctor", () => {
    expect(holoKind("x")).toBe("doctor");
    expect(holoKind("lab")).toBe("lab");
  });
  it("clusters and switches motion off when reduced", () => {
    expect(HOLO_CLUSTER.cluster).toBe(true);
    expect(holoMotion(true)).toEqual({ pulse: false, lift: false, fly: false });
    expect(holoMotion(false).pulse).toBe(true);
  });
  it("keeps only providers with a position, as [lng, lat]", () => {
    const fc = holoFeatures([{ id: "a", type: "lab", lat: 24.7, lng: 46.6 }, { id: "b", type: "lab" }, { id: "c", type: "lab", lat: NaN, lng: 1 }]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.coordinates).toEqual([46.6, 24.7]);
  });
});
