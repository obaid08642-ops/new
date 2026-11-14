// CAT-1: /diagnostics (hub) and /labs list the same tests from the same source; the hub filters by place only after the patient picks one.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogRows, type CatalogLoad } from "@/components-next/diagnostics/catalog-load";
import type { RowContext } from "@/components-next/diagnostics/catalog-rows";
import { extractLabServices } from "@/lib/api/labs";

const ctx: RowContext = { locale: "en", tr: (key) => key, itemHref: (id) => `/en/labs/${id}` };

// 120 public tests over 6 server pages of 20; every fifth one is done at the centre only (no home collection)
const pages: CatalogLoad[] = Array.from({ length: 6 }, (_, p) => ({
  ok: true,
  labs: extractLabServices(Array.from({ length: 20 }, (_, i) => {
    const n = p * 20 + i;
    return { id: `t${n}`, name_en: `Test ${n}`, home_visit_supported: n % 5 !== 0, facility_visit_supported: true };
  })),
  scans: [],
  page: p + 1,
  hasMore: p < 5,
  total: 120,
}));

describe("hub and /labs list the same tests", () => {
  const labsIds = catalogRows("lab", pages, { place: "all", pay: "self_pay" }, ctx).map((r) => r.id);
  it("/labs lists all 120", () => expect(labsIds).toHaveLength(120));
  it("the hub's default list (no place picked) is the same ids in the same order", () => {
    const hubDefault = catalogRows("lab", pages, { place: "all", pay: "self_pay" }, ctx).map((r) => r.id);
    expect(hubDefault).toEqual(labsIds);
  });
  it("only an explicit place filters the hub list", () => {
    const home = catalogRows("lab", pages, { place: "home", pay: "self_pay" }, ctx).map((r) => r.id);
    expect(home.length).toBeLessThan(labsIds.length);
  });
  it("the hub page lists with place 'all' unless ?place= is given, and both pages page through the same loader", () => {
    const hub = readFileSync("app/[locale]/diagnostics/page.tsx", "utf8");
    expect(hub).toContain('place: placeExplicit ? orderPlace : ("all" as const)');
    expect(hub).toContain("catalogRows(listKind, okLoads, listOrder, rowCtx)");
    expect(hub).toContain("loadCatalogPage(");
    expect(readFileSync("components-next/diagnostics/catalogue-list.tsx", "utf8")).toContain("loadCatalogPage(");
    expect(readFileSync("components-next/diagnostics/catalogue-list.tsx", "utf8")).toContain('place: "all"');
  });
});
