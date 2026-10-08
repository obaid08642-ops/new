import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Batch 14, part 14b: the merged routes of labs/radiology and pharmacy. Each old route redirects to the screen that now holds
 * it and keeps the query; the SEO routes redirect permanently to the canonical catalogue and product pages.
 */
const nav = vi.hoisted(() => ({ redirect: vi.fn(), permanentRedirect: vi.fn(), notFound: vi.fn() }));
vi.mock("next/navigation", () => nav);
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));

import { catalogueHref } from "@/lib/catalogue-href";
import TechnicianPage from "../app/[locale]/diagnostics/technician-tracking/page";
import InsuranceUploadPage from "../app/[locale]/diagnostics/insurance-upload/page";
import WaitingPage from "../app/[locale]/pharmacy/waiting-for-pharmacy/page";
import RequestPage from "../app/[locale]/pharmacy/request/page";
import ScanPrescriptionPage from "../app/[locale]/pharmacy/scan-prescription/page";
import ManualOrderPage from "../app/[locale]/pharmacy/manual-order/page";
import FiltersPage from "../app/[locale]/pharmacy/filters/page";
import InteractionsPage from "../app/[locale]/pharmacy/interactions/page";
import DrugScannerPage from "../app/[locale]/drug-scanner/page";
import MedicinesPage from "../app/[locale]/medicines/page";
import MedicineCatalogPage from "../app/[locale]/medicine-catalog/page";
import MedicineIndexPage from "../app/[locale]/medicine/page";
import MedicineSlugPage from "../app/[locale]/medicine/[slug]/page";

const params = Promise.resolve({ locale: "en" });
const run = (Page: (props: never) => Promise<unknown>, search: Record<string, string> = {}) => (Page as (props: unknown) => Promise<unknown>)({ params, searchParams: Promise.resolve(search) });

beforeEach(() => vi.clearAllMocks());

describe("in-app redirects keep the query", () => {
  it("technician tracking goes to sample tracking", async () => {
    await run(TechnicianPage, { bookingId: "b1" });
    expect(nav.redirect).toHaveBeenCalledWith("/en/diagnostics/sample-tracking?bookingId=b1");
  });
  it("insurance upload goes to the insurance step, bookingId becoming orderId", async () => {
    await run(InsuranceUploadPage, { bookingId: "b1" });
    expect(nav.redirect).toHaveBeenCalledWith("/en/diagnostics/insurance-approval?orderId=b1");
  });
  it("waiting for the pharmacy goes to the offers screen", async () => {
    await run(WaitingPage, { orderId: "o1" });
    expect(nav.redirect).toHaveBeenCalledWith("/en/pharmacy/broadcast-status?orderId=o1");
  });
  it.each([
    ["request", RequestPage, "/en/pharmacy/rx-order?via=type"],
    ["scan-prescription", ScanPrescriptionPage, "/en/pharmacy/rx-order?via=photo"],
    ["manual-order", ManualOrderPage, "/en/pharmacy/rx-order?via=type"],
  ])("%s is a way in of order with a prescription", async (_name, Page, expected) => {
    await run(Page as never);
    expect(nav.redirect).toHaveBeenCalledWith(expected);
  });
  it("interactions and drug-scanner go to scan a medicine", async () => {
    await run(InteractionsPage);
    await run(DrugScannerPage);
    expect(nav.redirect).toHaveBeenNthCalledWith(1, "/en/pharmacy/barcode");
    expect(nav.redirect).toHaveBeenNthCalledWith(2, "/en/pharmacy/barcode");
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
