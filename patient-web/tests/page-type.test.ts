import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PAGE_TYPES, pageType } from "@/lib/perf/page-type";

describe("RUM page type (P14.23)", () => {
  it("is the same list as the backend's RUM_PAGE_TYPES", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../backend/src/modules/rum/rum.constants.ts"), "utf8");
    const block = /RUM_PAGE_TYPES = \[([\s\S]*?)\] as const/.exec(src);
    expect(block).not.toBeNull();
    const backend = [...block![1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
    expect(backend).toEqual([...PAGE_TYPES]);
  });

  it.each([
    ["/ar", "home"],
    ["/en/", "home"],
    ["/ar/p/panadol-500", "product"],
    ["/ar/c", "catalogue"],
    ["/ar/c/pain-relief", "catalogue"],
    ["/ar/doctor/dr-sara", "doctor"],
    ["/ar/consultations/doctors", "doctors"],
    ["/ar/consultations/doctors/abc", "doctor"],
    ["/ar/articles", "articles"],
    ["/ar/articles/sleep", "article"],
    ["/ar/diagnostics/labs/cbc", "lab"],
    ["/ar/radiology/mri", "radiology"],
    ["/ar/pharmacy/cart", "cart"],
    ["/ar/pharmacy/payment", "checkout"],
    ["/ar/pharmacy/some-pharmacy", "pharmacy"],
    ["/ar/orders/123", "orders"],
    ["/ar/profile", "account"],
    ["/ar/login", "auth"],
    ["/ar/something-else", "other"],
  ])("%s -> %s", (p, type) => {
    expect(pageType(p)).toBe(type);
  });

  it("never returns anything outside the list", () => {
    for (const p of ["/x/y", "", "/ar/p", "/fil/c?x=1"]) expect(PAGE_TYPES).toContain(pageType(p));
  });
});
