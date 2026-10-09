import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPatientHomeCareBookings: vi.fn(), requirePatientAccess: vi.fn() }));

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
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/home-care-server", () => ({ getPatientHomeCareBookings: state.getPatientHomeCareBookings }));

import HomeCarePage from "./page";

const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-home-care-token-never-in-html";

describe("home-care SSR boundary", () => {
  beforeEach(() => {
    state.getPatientHomeCareBookings.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
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
});
