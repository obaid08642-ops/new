import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getDiagnosticBookings: vi.fn(), getDiagnosticBooking: vi.fn(), getDiagnosticTracking: vi.fn(), requirePatientAccess: vi.fn(), labs: vi.fn(), radiology: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
// the real en messages, so a missing key fails here
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children, title, backHref }: { children: ReactNode; title?: string; backHref?: string }) => createElement("div", { "data-shell": true, "data-title": title, "data-back": backHref }, children),
}));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, locales: ["en"] }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/diagnostics-server", () => ({ getDiagnosticBookings: state.getDiagnosticBookings, getDiagnosticBooking: state.getDiagnosticBooking, getDiagnosticTracking: state.getDiagnosticTracking }));
vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.labs }));
vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServices: state.radiology }));
vi.mock("@/components-next/nav/stale-while-revalidate", () => ({ StaleWhileRevalidate: () => null }));

import DiagnosticsPage from "./page";
import DiagnosticDetailPage from "./bookings/[domain]/[bookingId]/page";

const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-diagnostic-token-never-in-html";
const reportUrl = "https://example.test/private-report.pdf";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const hub = async (searchParams: Record<string, string> = {}) => renderToStaticMarkup(await DiagnosticsPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve(searchParams) }));

describe("diagnostics SSR boundary", () => {
  beforeEach(() => {
    state.getDiagnosticBookings.mockReset();
    state.getDiagnosticBooking.mockReset();
    state.getDiagnosticTracking.mockReset().mockResolvedValue(json({ steps: [] }));
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
    state.labs.mockReset().mockResolvedValue(json([]));
    state.radiology.mockReset().mockResolvedValue(json([]));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([])));
  });

  // The timeout is explicit and generous because this is a RENDERING assertion, not a performance one: it checks that
  // the server boundary does not serialise the token or private fields (a 5 s default measured how busy the machine was).
  it("renders list data through both server boundaries without embedding the token or sensitive fields", { timeout: 30_000 }, async () => {
    state.getDiagnosticBookings
      .mockResolvedValueOnce(json([{ id: bookingId, state: "CONFIRMED", patient_name: "private", total_price: 500 }]))
      .mockResolvedValueOnce(json([]));

    const html = await hub();

    expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(1, serverToken, "labs");
    expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(2, serverToken, "radiology");
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("private");
    expect(html).not.toContain("500");
    expect(html).toContain(`/en/diagnostics/bookings/labs/${bookingId}`);
    expect(html).not.toContain("style=");
  });

  it("draws the catalogue the server sent: packages, tests with their price and an add link, and never a made-up price", async () => {
    state.requirePatientAccess.mockRejectedValue(new Error("no session"));
    state.labs.mockResolvedValue(json([{ id: "cbc", name_en: "CBC", price: 20, fasting_required: true, home_visit_supported: true, turnaround_hours: 24 }, { id: "tsh", name_en: "TSH" }]));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([{ id: "pkg-1", name_en: "Wellness panel", price: 120, included_services: ["cbc", "tsh"] }])));

    const html = await hub();

    expect(html).toContain("CBC");
    expect(html).toContain("Wellness panel");
    expect(html).toContain("/en/diagnostics/packages/pkg-1");
    expect(html).toContain("/en/diagnostics/cart?add=cbc&amp;name=CBC&amp;price=20");
    expect(html).toContain("/en/diagnostics/cart?add=tsh&amp;name=TSH");
    expect(html).not.toContain("add=tsh&amp;name=TSH&amp;price");
    expect(html).toContain("Result within 24 hours");
    expect(state.getDiagnosticBookings).not.toHaveBeenCalled();
  });

  it("switches to the radiology scans from the URL and keeps the other choices in the links", async () => {
    state.requirePatientAccess.mockRejectedValue(new Error("no session"));
    state.radiology.mockResolvedValue(json([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", price: 90 }]));

    const html = await hub({ kind: "radiology", place: "facility" });

    expect(html).toContain("Chest X-Ray");
    expect(html).toContain("/en/diagnostics/radiology/6a7600a27b25eeca204de283");
    expect(html).toContain("From");
    expect(html).toContain("/en/diagnostics?kind=radiology&amp;place=facility");
  });

  it("shows the error state with a retry when the whole catalogue fails", async () => {
    state.requirePatientAccess.mockRejectedValue(new Error("no session"));
    state.labs.mockResolvedValue(new Response("", { status: 503 }));
    state.radiology.mockResolvedValue(new Response("", { status: 503 }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));

    const html = await hub();

    expect(html).toMatch(/role="alert"/);
    expect(html).toContain("Try again");
  });

  it("renders detail through the server boundary without embedding patient or report data", async () => {
    state.getDiagnosticBooking.mockResolvedValue(json({ id: bookingId, state: "CONFIRMED", patient_phone: "private", reports: [{ url: reportUrl }], documents: [{ url_or_b64: reportUrl }], signed_report_pdf_url: reportUrl, total_price: 500 }));

    const html = renderToStaticMarkup(await DiagnosticDetailPage({ params: Promise.resolve({ locale: "en", domain: "labs", bookingId }) }));

    expect(state.getDiagnosticBooking).toHaveBeenCalledWith(serverToken, "labs", bookingId);
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("private");
    expect(html).not.toContain("500");
    expect(html).not.toContain(reportUrl);
    expect(html).toContain('data-back="/en/diagnostics/bookings"');
    expect(html).toContain("Confirmed");
    expect(html).not.toMatch(/href="[^"]*(report|pdf)/i);
    expect(html).not.toContain("CONFIRMED");
  });
});
