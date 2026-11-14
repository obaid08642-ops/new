// Wire-up of the paged labs / radiology catalogue (backend #2041): parameter building, both response shapes, category -> illustration,
// the rating line, the chip -> server category rule and the rows the hub draws.
import { describe, expect, it } from "vitest";
import { catalogRows, type CatalogLoad } from "@/components-next/diagnostics/catalog-load";
import { labRow, ratingLine, scanRow, type RowContext } from "@/components-next/diagnostics/catalog-rows";
import { artOfBackendCategory, diagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import { extractLabServices } from "@/lib/api/labs";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { CATALOG_MAX_LIMIT, catalogParams, catalogSortOf, hasMorePages, parseCatalogPage, serverCategoryOf } from "@/lib/diagnostics-catalog";

const ctx: RowContext = {
  locale: "en",
  tr: (key, values) => (key === "ratingLine" ? `Rating ${values?.value} (${values?.count})` : key === "fromPrice" ? `From ${values?.price}` : key),
  itemHref: (id, kind) => `/en/labs/${id}?kind=${kind}`,
};

describe("parameters the backend takes", () => {
  it("sends page with limit (default 20, capped at 100), category, search, home_visit and the sort flag", () => {
    expect(catalogParams({ page: 2, category: "mri", search: " knee ", sort: "highest_rated", homeVisit: true }).toString()).toBe("page=2&limit=20&category=mri&search=knee&home_visit=true&highest_rated=true");
    expect(catalogParams({ page: 1, limit: 500 }).get("limit")).toBe(String(CATALOG_MAX_LIMIT));
    expect(catalogParams({ page: 3, limit: 6, sort: "lowest_price" }).toString()).toBe("page=3&limit=6&lowest_price=true");
  });
  it("sends no limit without a page (the plain array comes back) and drops bad values", () => {
    expect(catalogParams({}).toString()).toBe("");
    expect(catalogParams({ limit: 6 }).has("limit")).toBe(false);
    expect(catalogParams({ page: 0 }).has("page")).toBe(false);
    expect(catalogParams({ page: 1, category: "a&b=c" }).has("category")).toBe(false);
  });
  it("maps the hub sort to the backend flag", () => {
    expect(catalogSortOf("rating")).toBe("highest_rated");
    expect(catalogSortOf("price")).toBe("lowest_price");
    expect(catalogSortOf(undefined)).toBeUndefined();
  });
  it("scan chips filter on the server by their key (category = modality); test chips stay a client filter", () => {
    expect(serverCategoryOf("radiology", "mri")).toBe("mri");
    expect(serverCategoryOf("radiology", "all")).toBeUndefined();
    expect(serverCategoryOf("lab", "hormones")).toBeUndefined();
  });
});

describe("both response shapes", () => {
  const rows = [{ id: "a" }, { id: "b" }];
  it("reads the plain array", () => {
    expect(parseCatalogPage(rows)).toEqual({ rows, total: 2, page: null, totalPages: null });
  });
  it("reads { data, total, page, limit, total_pages }", () => {
    const info = parseCatalogPage({ data: rows, total: 45, page: 1, limit: 20, total_pages: 3 });
    expect(info).toEqual({ rows, total: 45, page: 1, totalPages: 3 });
    expect(hasMorePages(info)).toBe(true);
    expect(hasMorePages({ ...info, page: 3 })).toBe(false);
  });
  it("anything else is an empty page; a full page without totals may have more", () => {
    expect(parseCatalogPage(null).rows).toEqual([]);
    expect(parseCatalogPage({ message: "x" }).rows).toEqual([]);
    expect(hasMorePages({ rows: new Array(20).fill(0), page: null, totalPages: null })).toBe(true);
    expect(hasMorePages({ rows: [1], page: null, totalPages: null })).toBe(false);
  });
  it("the service parsers read the rows of either shape, with category and rating", () => {
    const scan = { id: "s1", name_en: "Knee MRI", modality: "mri", category: "mri", price: 300, rating: 4.25, rating_count: 8 };
    expect(extractRadiologyServices({ data: [scan], total: 1, page: 1, limit: 20, total_pages: 1 })[0]).toMatchObject({ id: "s1", category: "mri", rating: 4.25, ratingCount: 8 });
    expect(extractRadiologyServices([{ ...scan, rating: null, rating_count: 0 }])[0]).toMatchObject({ rating: undefined, ratingCount: 0 });
    expect(extractLabServices({ data: [{ id: "t1", name_en: "CBC", category: "blood", rating: 4, rating_count: 3 }] })[0]).toMatchObject({ rating: 4, ratingCount: 3 });
  });
});

describe("the backend category decides the illustration first", () => {
  it("knows the values the catalogue holds, for the right kind only", () => {
    expect(artOfBackendCategory("radiology", "MRI")).toBe("mri");
    expect(artOfBackendCategory("lab", "diabetes")).toBe("sugar");
    expect(artOfBackendCategory("lab", "kidney")).toBe("liver");
    expect(artOfBackendCategory("lab", "mri")).toBeNull();
    expect(artOfBackendCategory("radiology", "blood")).toBeNull();
    expect(artOfBackendCategory("radiology", "dexa")).toBeNull();
    expect(artOfBackendCategory("lab", undefined)).toBeNull();
    expect(artOfBackendCategory("lab", "constructor")).toBeNull();
  });
  it("wins over the names, which only decide when the category is unknown", () => {
    expect(diagArtKey({ kind: "radiology", category: "ct", modality: "mri", names: ["Knee MRI"] })).toBe("ct");
    expect(diagArtKey({ kind: "lab", category: "hormones", names: ["Complete blood count"] })).toBe("hormones");
    expect(diagArtKey({ kind: "lab", category: "infection", names: ["Vitamin D"] })).toBe("vitamins");
    expect(diagArtKey({ kind: "radiology", category: "dexa", names: ["Bone density"] })).toBe("xray");
    expect(diagArtKey({ kind: "radiology", category: undefined, modality: "ultrasound" })).toBe("ultrasound");
  });
  it("the row builders pass the row's category", () => {
    const [scan] = extractRadiologyServices([{ id: "s1", name_en: "Chest film", modality: "xray", category: "mammography" }]);
    expect(scanRow(scan, ctx).art).toBe("mammography");
    const [lab] = extractLabServices([{ id: "t1", name_en: "Panel", category: "liver" }]);
    expect(labRow(lab, ctx).art).toBe("liver");
  });
});

describe("rating on the card", () => {
  it("shows one line only for a rating above 0 with its count", () => {
    expect(ratingLine(ctx, 4.25, 8)).toBe("Rating 4.3 (8)");
    expect(ratingLine(ctx, 0, 5)).toBeUndefined();
    expect(ratingLine(ctx, undefined, undefined)).toBeUndefined();
    expect(ratingLine(ctx, 4, 0)).toBeUndefined();
  });
  it("is on the row only when the server sent it", () => {
    const [rated, plain] = extractRadiologyServices([{ id: "s1", name_en: "A", rating: 4.5, rating_count: 2 }, { id: "s2", name_en: "B", rating: null, rating_count: 0 }]);
    expect(scanRow(rated, ctx).rating).toBe("Rating 4.5 (2)");
    expect(scanRow(plain, ctx).rating).toBeUndefined();
  });
});

describe("rows of the loaded pages", () => {
  const load = (labs: unknown[]): CatalogLoad => ({ ok: true, labs: extractLabServices(labs), scans: [], page: 1, hasMore: false, total: labs.length });
  it("keeps the server order, hides packages and what does not fit the order's place or payment", () => {
    const rows = catalogRows("lab", [load([
      { id: "a", name_en: "A", home_visit_supported: true },
      { id: "p", name_en: "Pack", is_package: true },
      { id: "c", name_en: "C", home_visit_supported: false },
      { id: "i", name_en: "I", insurance_availability: true },
    ])], { place: "home", pay: "self_pay" }, ctx);
    expect(rows.map((r) => r.id)).toEqual(["a", "i"]);
    expect(catalogRows("lab", [load([{ id: "a", name_en: "A" }, { id: "i", name_en: "I", insurance_availability: true }])], { place: "home", pay: "insurance" }, ctx).map((r) => r.id)).toEqual(["i"]);
  });
});

describe("R1: radiology with all four modalities", () => {
  const raw = [
    { id: "u1", name_en: "Abdomen ultrasound", category: "ultrasound", home_visit_supported: true },
    { id: "x1", name_en: "Chest X-ray", category: "xray", home_visit_supported: false },
    { id: "c1", name_en: "Head CT", category: "ct", home_visit_supported: false },
    { id: "m1", name_en: "Knee MRI", category: "mri" },
  ];
  const scans = extractRadiologyServices(raw);
  const loaded: CatalogLoad = { ok: true, labs: [], scans, page: 1, hasMore: false, total: 4 };
  const placeCtx: RowContext = { ...ctx, itemHref: (id, kind, facilityOnly) => `/en/labs/${id}?kind=${kind}&place=${facilityOnly ? "facility" : "home"}` };
  it("shows every scan with All, whatever the order's place (home used to hide x-ray, CT and MRI)", () => {
    for (const place of ["home", "facility"] as const) {
      expect(catalogRows("radiology", [loaded], { place, pay: "self_pay" }, placeCtx).map((r) => r.id)).toEqual(["u1", "x1", "c1", "m1"]);
    }
  });
  it("opens a scan that cannot be done at home at the centre", () => {
    const hrefs = catalogRows("radiology", [loaded], { place: "home", pay: "self_pay" }, placeCtx).map((r) => r.href.split("place=")[1]);
    expect(hrefs).toEqual(["home", "facility", "facility", "facility"]);
  });
  it("each chip sends its own modality to the server and its art matches the rows", () => {
    const rows = catalogRows("radiology", [loaded], { place: "home", pay: "self_pay" }, placeCtx);
    expect(rows.map((r) => r.art)).toEqual(["ultrasound", "xray", "ct", "mri"]);
    for (const key of ["ultrasound", "xray", "ct", "mri"] as const) {
      expect(serverCategoryOf("radiology", key)).toBe(key);
      expect(rows.filter((r) => r.art === key)).toHaveLength(1);
    }
    expect(serverCategoryOf("radiology", "all")).toBeUndefined();
  });
});
