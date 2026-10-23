import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPatientHomeCareBookings: vi.fn(), requirePatientAccess: vi.fn(), services: vi.fn(), packages: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
// the real en messages, so a missing key fails here
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children }: { children: ReactNode }) => createElement("div", { "data-shell": true }, children),
}));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, getDirection: () => "ltr", locales: ["en"] }));
// issue 1550: the hub reads the session without requiring it (a guest gets the public part)
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess, getOptionalPatientAccessToken: state.requirePatientAccess }));
vi.mock("@/lib/api/home-care-server", () => ({ getPatientHomeCareBookings: state.getPatientHomeCareBookings }));

vi.mock("@/lib/api/public-services-server", () => ({ readPublicHomeCareServices: state.services, readPublicHomeCareProviders: vi.fn().mockResolvedValue({ failed: true, body: null }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.packages }));

import HomeCarePage from "./page";

const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-home-care-token-never-in-html";

describe("home-care SSR boundary", () => {
  beforeEach(() => {
    state.getPatientHomeCareBookings.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
    state.services.mockReset().mockResolvedValue({ failed: false, body: [] });
    state.packages.mockReset().mockImplementation(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
  });

  it("renders approved list fields only without token, location, clinical notes, or pricing", async () => {
    state.getPatientHomeCareBookings.mockResolvedValue(new Response(JSON.stringify([{ id: bookingId, service_name_en: "Verified service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, patient_name: "private", address: { address: "private-location" }, clinical_notes: "private-note", total_price: 500, gps_tracking: { current_lat: 1 } }]), { status: 200 }));

    const html = renderToStaticMarkup(await HomeCarePage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientHomeCareBookings).toHaveBeenCalledWith(serverToken);
    expect(html).toContain("Verified service");
    expect(html).toContain("Confirmed");
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("private");
    expect(html).not.toContain("500");
    expect(html).not.toContain("current_lat");
  });

  it("shows the raw state as a phrase, never the code, and an empty state when there are no bookings", async () => {
    state.getPatientHomeCareBookings.mockResolvedValue(new Response(JSON.stringify([{ id: bookingId, service_name_en: "Verified service", state: "SOMETHING_NEW" }]), { status: 200 }));
    const withUnknown = renderToStaticMarkup(await HomeCarePage({ params: Promise.resolve({ locale: "en" }) }));
    expect(withUnknown).not.toContain("SOMETHING_NEW");
    expect(withUnknown).toContain("Status unavailable");

    state.getPatientHomeCareBookings.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const empty = renderToStaticMarkup(await HomeCarePage({ params: Promise.resolve({ locale: "en" }) }));
    expect(empty).toContain("There are currently no home-care bookings available.");
  });

  it("shows the error state with a retry when the backend fails", async () => {
    state.getPatientHomeCareBookings.mockResolvedValue(new Response("{}", { status: 500 }));
    const html = renderToStaticMarkup(await HomeCarePage({ params: Promise.resolve({ locale: "en" }) }));
    expect(html).toContain("Unable to load home care");
    expect(html).toContain("Retry");
  });

  it("parity with the app hub: care packages, the services, a search and the card or insurance choice on one page", async () => {
    state.services.mockResolvedValue({ failed: false, body: [{ id: "svc-1", name_en: "Wound care", price: 80, insurance_availability: true }, { id: "svc-2", name_en: "Vitals check", price: 40, insurance_availability: false }] });
    state.packages.mockImplementation(async () => new Response(JSON.stringify({ data: [{ id: "pkg-1", name_en: "Weekly care", price: 300, kind: "package" }] }), { status: 200 }));
    state.getPatientHomeCareBookings.mockResolvedValue(new Response("[]", { status: 200 }));
    const html = renderToStaticMarkup(await HomeCarePage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) }));
    expect(html).toContain("Care packages");
    expect(html).toContain("Weekly care");
    expect(html).toContain('href="/en/home-care/services/svc-1"');
    expect(html).toContain("Vitals check");
    // insurance hides what insurance does not cover and is carried to the service page
    const insurance = renderToStaticMarkup(await HomeCarePage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ pay: "insurance" }) }));
    expect(insurance).not.toContain("Vitals check");
    expect(insurance).toContain('href="/en/home-care/services/svc-1?pay=insurance"');
    // the search narrows the services
    const found = renderToStaticMarkup(await HomeCarePage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "vitals" }) }));
    expect(found).toContain("Vitals check");
    expect(found).not.toContain("Wound care");
  });
});
