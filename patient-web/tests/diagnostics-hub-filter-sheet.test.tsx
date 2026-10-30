import { describe, expect, it } from "vitest";
import { hubFilterParams } from "@/components-next/diagnostics/hub-filter-sheet";
import { catalogRows, SAME_DAY_HOURS, type CatalogLoad } from "@/components-next/diagnostics/catalog-load";
import type { RowContext } from "@/components-next/diagnostics/catalog-rows";
import { extractLabServices } from "@/lib/api/labs";

const ctx: RowContext = { locale: "en", tr: (key, values) => (values?.time ? `${key}:${values.time}` : key), itemHref: (id) => `/en/labs/${id}` };
const load: CatalogLoad = {
  ok: true,
  labs: extractLabServices([
    { id: "a", name_en: "A", fasting_required: true, turnaround_hours: 6 },
    { id: "b", name_en: "B", fasting_required: false, turnaround_hours: 24 },
    { id: "c", name_en: "C", fasting_required: false, turnaround_hours: 72 },
    { id: "d", name_en: "D" },
  ]),
  scans: [],
  page: 1,
  hasMore: false,
  total: 4,
};
const ids = (order: Parameters<typeof catalogRows>[2]) => catalogRows("lab", [load], order, ctx).map((r) => r.id);

describe("hub filter sheet", () => {
  it("writes only non-default choices into the URL", () => {
    const base = { kind: "labs" as const, q: "", cat: "all" };
    expect(hubFilterParams(base, { place: "all", pay: "self_pay", sort: "", noFast: false, sameDay: false }).toString()).toBe("");
    const all = hubFilterParams({ kind: "radiology", q: "knee", cat: "mri" }, { place: "home", pay: "insurance", sort: "price", noFast: true, sameDay: true });
    expect(Object.fromEntries(all)).toEqual({ q: "knee", kind: "radiology", place: "home", pay: "insurance", sort: "price", nofast: "1", sameday: "1", cat: "mri" });
  });
  it("no-fasting drops only the tests the catalogue says need fasting", () => {
    expect(ids({ place: "all", pay: "self_pay", noFasting: true })).toEqual(["b", "c", "d"]);
  });
  it("same-day keeps only tests with a result within the same-day hours (none without turnaround_hours)", () => {
    expect(SAME_DAY_HOURS).toBe(24);
    expect(ids({ place: "all", pay: "self_pay", sameDay: true })).toEqual(["a", "b"]);
    expect(ids({ place: "all", pay: "self_pay", noFasting: true, sameDay: true })).toEqual(["b"]);
  });
  it("a card says 'No fasting · Result within' from the catalogue fields only", () => {
    const rows = catalogRows("lab", [load], { place: "all", pay: "self_pay" }, ctx);
    expect(rows.find((r) => r.id === "b")?.meta).toMatch(/^noFasting · resultWithin:/);
    expect(rows.find((r) => r.id === "a")?.meta?.startsWith("tagFasting · ")).toBe(true);
    expect(rows.find((r) => r.id === "d")?.meta).toBeUndefined();
  });
});
