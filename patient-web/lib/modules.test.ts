import { describe, expect, it } from "vitest";
import { MODULE_KEYS, MODULE_PATHS, isPathHidden, moduleDisabledKey, moduleForPath, parseDisabled, visibleItems } from "./modules";

describe("module switches table (web)", () => {
  it("knows every backend key and gives each at least one page", () => {
    expect(MODULE_KEYS).toHaveLength(12);
    for (const key of MODULE_KEYS) expect(MODULE_PATHS[key].length).toBeGreaterThan(0);
  });

  it("only an explicit false switches a module off; unknown keys and odd payloads switch nothing off", () => {
    expect([...parseDisabled({ modules: { loyalty: false, ai: true, pharmacy: 0, future_thing: false } })]).toEqual(["loyalty"]);
    expect(parseDisabled(null).size).toBe(0);
    expect(parseDisabled({}).size).toBe(0);
    expect(parseDisabled({ modules: [false] }).size).toBe(0);
    expect(parseDisabled("x").size).toBe(0);
  });

  it("maps a page, with or without the locale, to its module", () => {
    expect(moduleForPath("/ar/loyalty/hub")).toBe("loyalty");
    expect(moduleForPath("/loyalty")).toBe("loyalty");
    expect(moduleForPath("/en/c/vitamins?x=1")).toBe("pharmacy");
    expect(moduleForPath("/fil/p/panadol")).toBe("pharmacy");
    expect(moduleForPath("/ar/consultations/doctors")).toBe("consultations");
    expect(moduleForPath("/ar/doctors")).toBe("consultations");
    expect(moduleForPath("/ar/diagnostics/labs")).toBe("labs_radiology");
    expect(moduleForPath("/ur/nursing/catalog")).toBe("nursing");
    expect(moduleForPath("/ar/home-care")).toBe("nursing");
    expect(moduleForPath("/hi/mental-health")).toBe("mental_health");
    expect(moduleForPath("/bn/ai?mode=symptoms")).toBe("ai");
    expect(moduleForPath("/ar/articles")).toBe("articles");
  });

  it("does not match look-alike prefixes or ungoverned pages", () => {
    expect(moduleForPath("/ar/consultations-x")).toBeNull();
    expect(moduleForPath("/ar/c2")).toBeNull();
    expect(moduleForPath("/ar/aid")).toBeNull();
    expect(moduleForPath("/ar/map")).toBeNull();
    expect(moduleForPath("/ar/health")).toBeNull();
    expect(moduleForPath("/ar/dashboard")).toBeNull();
    expect(moduleForPath("/ar")).toBeNull();
    expect(moduleForPath("//evil.example/loyalty")).toBeNull();
    expect(moduleForPath("https://x.example/loyalty")).toBeNull();
    expect(moduleForPath(null)).toBeNull();
  });

  it("hides only the entry points of switched-off modules", () => {
    const off = parseDisabled({ modules: { loyalty: false, nursing: false } });
    expect(isPathHidden("/ar/loyalty", off)).toBe(true);
    expect(isPathHidden("/ar/nursing/catalog", off)).toBe(true);
    expect(isPathHidden("/ar/c", off)).toBe(false);
    const items = [{ p: "/ar/c" }, { p: "/ar/nursing/catalog" }, { p: "/ar/map" }];
    expect(visibleItems(items, (i) => i.p, off).map((i) => i.p)).toEqual(["/ar/c", "/ar/map"]);
    expect(visibleItems(items, (i) => i.p, parseDisabled(null))).toHaveLength(3);
  });

  it("reads the backend refusal module_disabled:<key>", () => {
    expect(moduleDisabledKey("module_disabled:loyalty")).toBe("loyalty");
    expect(moduleDisabledKey(new Error("module_disabled:brand_new"))).toBe("unknown");
    expect(moduleDisabledKey("Forbidden")).toBeNull();
    expect(moduleDisabledKey(undefined)).toBeNull();
  });
});
