import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// #2067: the catalogue is the single source. The lists carry providers_count / from_price / where / insurance, the details carry the offers,
// a service nobody offers is still listed and its page offers "Notify me when available".
const state = vi.hoisted(() => ({ radiology: vi.fn(), labs: vi.fn(), detail: vi.fn(), requirePatientAccess: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, locales: ["en"] }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/diagnostics-server", () => ({ getDiagnosticBookings: vi.fn().mockResolvedValue(new Response("[]", { status: 200 })) }));
vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.labs }));
vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServices: state.radiology, getPublicRadiologyModalities: vi.fn().mockResolvedValue(new Response("[]", { status: 200 })), getPublicRadiologyServiceDetail: state.detail }));
vi.mock("@/components-next/nav/stale-while-revalidate", () => ({ StaleWhileRevalidate: () => null }));
// the button is a client island that asks the session on mount; here only that the page places it for this service
vi.mock("@/components-next/diagnostics/notify-me-button", () => ({ NotifyMeButton: (p: { serviceType: string; serviceId: string }) => createElement("button", { "data-notify": `${p.serviceType}:${p.serviceId}` }, "NOTIFY") }));

import DiagnosticsPage from "@/app/[locale]/diagnostics/page";
import RadiologyPage from "@/app/[locale]/diagnostics/radiology/page";
import RadiologyDetailPage from "@/app/[locale]/diagnostics/radiology/[serviceId]/page";
import { parseOfferSummary, parseOffers } from "@/lib/api/offers";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { catalogRows } from "@/components-next/diagnostics/catalog-load";
import { createTranslator } from "@/tests/helpers/intl";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const SERVED = { _id: "6a7600a27b25eeca204de281", name_en: "Chest X-Ray", modality: "xray", price: 90, home_visit_supported: false, providers_count: 3, from_price: 120, premises_available: true, home_available: false, insurance_accepted: true };
const EMPTY = { _id: "6a7600a27b25eeca204de282", name_en: "Cardiac MRI", modality: "mri", home_visit_supported: false, providers_count: 0, from_price: null, premises_available: false, home_available: false, insurance_accepted: false };
const params = Promise.resolve({ locale: "en" });
const hub = async (searchParams: Record<string, string>) => renderToStaticMarkup(await DiagnosticsPage({ params, searchParams: Promise.resolve(searchParams) }));
const radiologyPage = async (searchParams: Record<string, string> = {}) => renderToStaticMarkup((await RadiologyPage({ params, searchParams: Promise.resolve(searchParams) })) as never);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

beforeEach(() => {
  state.radiology.mockReset().mockImplementation(async () => json([SERVED, EMPTY]));
  state.labs.mockReset().mockImplementation(async () => json([{ id: "cbc", name_en: "CBC", providers_count: 2, from_price: 25, premises_available: true, home_available: true, insurance_accepted: false }, { id: "rare", name_en: "Rare panel", providers_count: 0, from_price: null, premises_available: false, home_available: false, insurance_accepted: false }]));
  state.detail.mockReset();
  state.requirePatientAccess.mockReset().mockRejectedValue(new Error("signed out"));
});

describe("the offer fields of the catalogue payload", () => {
  it("reads the summary and the offers, and draws nothing from an older answer that has none", () => {
    expect(parseOfferSummary(SERVED)).toEqual({ providersCount: 3, fromPrice: 120, premisesAvailable: true, homeAvailable: false, insuranceAccepted: true });
    expect(parseOfferSummary(EMPTY)).toMatchObject({ providersCount: 0, fromPrice: undefined });
    expect(parseOfferSummary({ id: "x", name_en: "Old" })).toBeUndefined();
    const offers = parseOffers({ offers: [{ provider: { id: "p1", name_en: "Alpha", name_ar: null, logo: null, rating: 4.5, rating_count: 12 }, price: 120, currency: "SAR", premises: true, home: false, insurance: true }, { provider: { id: "p2", name_en: "Beta" }, price: null, premises: true }, { nonsense: true }] });
    expect(offers.map((o) => [o.providerId, o.price, o.insurance])).toEqual([["p1", 120, true], ["p2", undefined, false]]);
  });
});

describe("one list, every entry point", () => {
  it("the hub's radiology tab and the radiology page draw the same cards from the same source", async () => {
    const fromHub = text(await hub({ kind: "radiology", place: "facility" }));
    const fromPage = text(await radiologyPage());
    for (const html of [fromHub, fromPage]) {
      expect(html).toContain("Chest X-Ray");
      expect(html).toContain("3 centres");
      expect(html).toContain("From");
      expect(html).toContain("At the centre");
      expect(html).toContain("Insurance accepted");
    }
    // both read the catalogue's first server page: there is no second list or fetch
    expect(state.radiology).toHaveBeenCalled();
    for (const call of state.radiology.mock.calls) expect(call[0]).toMatchObject({ page: 1 });
  });

  it("a scan nobody offers is still listed, with no price and the reason, even where the place filter would hide it", async () => {
    for (const html of [text(await hub({ kind: "radiology", place: "home" })), text(await radiologyPage())]) {
      expect(html).toContain("Cardiac MRI");
      expect(html).toContain("No centre offers this yet");
    }
  });

  it("the labs list carries the same offer lines and keeps the test nobody offers", async () => {
    const html = text(await hub({ place: "home" }));
    expect(html).toContain("CBC");
    expect(html).toContain("2 centres");
    expect(html).toContain("Rare panel");
    expect(html).toContain("No centre offers this yet");
  });

  it("rows of the pure builder: the count is a number the locale formats, the from-price is the providers'", () => {
    const rows = catalogRows("radiology", [{ ok: true, labs: [], scans: extractRadiologyServices([SERVED, EMPTY]), page: 1, hasMore: false, total: 2 }], { place: "all", pay: "self_pay" }, { locale: "en", tr: (key, values) => createTranslator("en", "DiagWeb")(key, values), itemHref: (id) => `/x/${id}` });
    expect(rows.map((r) => [r.title, r.offer?.providers, r.offer?.none])).toEqual([["Chest X-Ray", "3 centres", false], ["Cardiac MRI", "No centre offers this yet", true]]);
    expect(rows[0].offer?.from).toMatch(/120/);
    expect(rows[0].price).toBeUndefined();
    expect(rows[1].offer?.from).toBeUndefined();
  });
});

describe("the detail", () => {
  const detail = async (body: unknown) => {
    state.detail.mockResolvedValue(json(body));
    return text(renderToStaticMarkup((await RadiologyDetailPage({ params: Promise.resolve({ locale: "en", serviceId: "6a7600a27b25eeca204de282" }) })) as never));
  };
  it("lists the offers cheapest first as a price comparison", async () => {
    const html = await detail({ ...SERVED, offers: [
      { provider: { id: "p1", name_en: "Alpha Imaging", rating: 4.5, rating_count: 12 }, price: 120, currency: "SAR", premises: true, home: false, insurance: true },
      { provider: { id: "p2", name_en: "Beta Scan" }, price: 150, currency: "SAR", premises: true, home: true, insurance: false },
      { provider: { id: "p3", name_en: "Gamma Centre" }, price: null, currency: "SAR", premises: true, home: false, insurance: false },
    ] });
    expect(html).toContain("Centres that offer this");
    expect(html.indexOf("Alpha Imaging")).toBeLessThan(html.indexOf("Beta Scan"));
    expect(html.indexOf("Beta Scan")).toBeLessThan(html.indexOf("Gamma Centre"));
    expect(html).toContain("Price not set");
    expect(html).toContain("Add to my order");
  });
  it("says no centre offers it yet and offers Notify me, without an order button", async () => {
    state.detail.mockResolvedValue(json({ ...EMPTY, offers: [] }));
    const html = renderToStaticMarkup((await RadiologyDetailPage({ params: Promise.resolve({ locale: "en", serviceId: "6a7600a27b25eeca204de282" }) })) as never);
    expect(text(html)).toContain("No centre offers this yet");
    expect(html).toContain('data-notify="radiology:6a7600a27b25eeca204de282"');
    expect(text(html)).not.toContain("Add to my order");
  });
});
