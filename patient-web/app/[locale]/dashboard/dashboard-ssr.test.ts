import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ accessToken: "dashboard-server-token-never-in-html", redirect: vi.fn(), profile: vi.fn(), appointment: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "nabd_access" ? { value: state.accessToken } : undefined) }) }));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/api/dashboard-server", () => ({ getPatientDashboardProfile: state.profile, getPatientDashboardUpcomingAppointment: state.appointment }));

import DashboardPage from "./page";

describe("dashboard SSR boundary", () => {
  beforeEach(() => {
    state.accessToken = "dashboard-server-token-never-in-html";
    state.redirect.mockReset();
    state.profile.mockReset().mockResolvedValue(new Response(JSON.stringify({ name: "Verified patient" }), { status: 200 }));
    state.appointment.mockReset().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 }));
  });

  it("renders the protected feature links without serializing the session token", async () => {
    const html = renderToStaticMarkup(await DashboardPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(html).not.toContain(state.accessToken);
    for (const href of ["/en/orders", "/en/appointments", "/en/health", "/en/reminders", "/en/diagnostics", "/en/home-care", "/en/family", "/en/chat", "/en/notifications", "/en/prescriptions", "/en/medicines", "/en/profile"]) expect(html).toContain(href);
    expect(html).toContain('aria-label="title"');
  });

  it("redirects missing sessions to the locale-specific sign-in route", async () => {
    state.accessToken = "";

    await DashboardPage({ params: Promise.resolve({ locale: "ar" }) });

    expect(state.redirect).toHaveBeenCalledWith("/ar/login");
  });
});
