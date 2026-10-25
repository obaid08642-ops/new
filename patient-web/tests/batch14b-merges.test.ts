import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Batch 14, part 14b: the merged routes of labs/radiology and pharmacy. Each old route redirects to the screen that now holds
 * it and keeps the query; the SEO routes redirect permanently to the canonical catalogue and product pages.
 */
const nav = vi.hoisted(() => ({ redirect: vi.fn(), permanentRedirect: vi.fn(), notFound: vi.fn() }));
vi.mock("next/navigation", () => nav);
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));

import { catalogueHref } from "@/lib/catalogue-href";
import InsuranceUploadPage from "../app/[locale]/diagnostics/insurance-upload/page";
import FiltersPage from "../app/[locale]/pharmacy/filters/page";
import MedicinesPage from "../app/[locale]/medicines/page";
import MedicineCatalogPage from "../app/[locale]/medicine-catalog/page";
import MedicineIndexPage from "../app/[locale]/medicine/page";
import MedicineSlugPage from "../app/[locale]/medicine/[slug]/page";

const params = Promise.resolve({ locale: "en" });
const run = (Page: (props: never) => Promise<unknown>, search: Record<string, string> = {}) => (Page as (props: unknown) => Promise<unknown>)({ params, searchParams: Promise.resolve(search) });

beforeEach(() => vi.clearAllMocks());

describe("in-app redirects keep the query", () => {
  it("insurance upload goes to the insurance step, bookingId becoming orderId", async () => {
    await run(InsuranceUploadPage, { bookingId: "b1" });
    expect(nav.redirect).toHaveBeenCalledWith("/en/diagnostics/insurance-approval?orderId=b1");
  });
  it("filters go to the catalogue with the chosen category", async () => {
    await run(FiltersPage, { filter_category: "vitamins", filter_sort: "trending" });
    expect(nav.redirect).toHaveBeenCalledWith("/en/c/vitamins");
  });
});

describe("SEO routes redirect permanently to the canonical pages", () => {
  it("the medicines list, the medicine catalogue and the medicine index land on /c", async () => {
    await run(MedicinesPage, { category: "vitamins", q: "c", page: "2", sort: "trending" });
    await run(MedicineCatalogPage, { q: "panadol" });
    await run(MedicineIndexPage);
    expect(nav.permanentRedirect).toHaveBeenNthCalledWith(1, "/en/c/vitamins?q=c&page=2");
    expect(nav.permanentRedirect).toHaveBeenNthCalledWith(2, "/en/c?q=panadol");
    expect(nav.permanentRedirect).toHaveBeenNthCalledWith(3, "/en/c");
  });
  it("a medicine page lands on /p/[slug], encoded once", async () => {
    await (MedicineSlugPage as (props: unknown) => Promise<unknown>)({ params: Promise.resolve({ locale: "ar", slug: "%D8%A8%D9%86%D8%A7%D8%AF%D9%88%D9%84" }), searchParams: Promise.resolve({}) });
    expect(nav.permanentRedirect).toHaveBeenCalledWith("/ar/p/%D8%A8%D9%86%D8%A7%D8%AF%D9%88%D9%84");
  });
  it("catalogueHref drops what the public catalogue cannot read", () => {
    expect(catalogueHref("en", { category: "all", page: "1", q: " " })).toBe("/en/c");
    expect(catalogueHref("en", { category: "a b", page: "0" })).toBe("/en/c/a%20b");
    expect(catalogueHref("en", { page: "99999" })).toBe("/en/c");
  });
});
