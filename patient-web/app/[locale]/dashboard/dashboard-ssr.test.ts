import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ accessToken: "dashboard-server-token-never-in-html", redirect: vi.fn(), profile: vi.fn(), appointment: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "nabd_access" ? { value: state.accessToken } : undefined) }) }));
vi.mock("next/navigation", () => ({ redirect: state.redirect, useRouter: () => ({ push: vi.fn() }), usePathname: () => "/ar/dashboard" }));
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/i18n")>()), isLocale: () => true }));
vi.mock("@/lib/api/dashboard-server", () => ({ getPatientDashboardProfile: state.profile, getPatientDashboardUpcomingAppointment: state.appointment }));

import DashboardPage from "./page";
import { HomeShell } from "@/components-next/home/home-shell";

/** The page returns the async <HomeShell>; resolve it once, then render the tree it returns. */
async function renderPage(locale: string) {
  const element = (await DashboardPage({ params: Promise.resolve({ locale }) })) as { props: Parameters<typeof HomeShell>[0] };
  return renderToStaticMarkup(await HomeShell(element.props));
}

describe("dashboard SSR boundary", () => {
  beforeEach(() => {
    state.accessToken = "dashboard-server-token-never-in-html";
    state.redirect.mockReset();
    state.profile.mockReset().mockResolvedValue(new Response(JSON.stringify({ display_name: "Verified patient" }), { status: 200 }));
    state.appointment.mockReset().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 }));
  });

  it("renders the protected feature links without serializing the session token", async () => {
    const html = await renderPage("en");

    expect(html).not.toContain(state.accessToken);
    for (const href of ["/en/orders", "/en/appointments", "/en/health", "/en/reminders", "/en/diagnostics", "/en/home-care", "/en/family", "/en/chat", "/en/notifications", "/en/prescriptions", "/en/medicines", "/en/profile"]) expect(html).toContain(href);
    expect(html).toContain('aria-labelledby="patient-dashboard-title"');
  });

  it("greets the patient by the name GET /users/me/display returns", async () => {
    const html = await renderPage("en");
    expect(html).toContain("Verified patient");
  });

  it("still renders with an empty 200 for the upcoming appointment and a 404 for the optional name (nothing to show, not an outage)", async () => {
    state.appointment.mockResolvedValue(new Response("", { status: 200 }));
    state.profile.mockResolvedValue(new Response("{}", { status: 404 }));
    const html = await renderPage("en");
    expect(html).toContain('aria-labelledby="patient-dashboard-title"');
    expect(html).not.toContain("unavailableTitle");
  });

  it.each([[500], [502], [503]])("shows the error state with a retry, inside the shell, when the profile call answers %s", async (status) => {
    state.profile.mockResolvedValue(new Response("{}", { status }));
    const html = await renderPage("en");
    expect(html).toContain("nabd-home-shell");
    expect(html).toContain("unavailableTitle");
    expect(html).toContain("unavailableBody");
    expect(html).toContain("retry");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('aria-labelledby="patient-dashboard-title"');
  });

  it("shows the error state when the upcoming-appointment call fails or does not answer", async () => {
    state.appointment.mockResolvedValue(new Response(null, { status: 503 }));
    expect(await renderPage("en")).toContain("unavailableTitle");
    state.appointment.mockRejectedValue(new Error("network"));
    expect(await renderPage("en")).toContain("unavailableTitle");
  });

  it("sends an expired session to sign-in instead of the error state", async () => {
    state.profile.mockResolvedValue(new Response("{}", { status: 401 }));
    await DashboardPage({ params: Promise.resolve({ locale: "ar" }) });
    expect(state.redirect).toHaveBeenCalledWith("/ar/login");
  });

  it("redirects missing sessions to the locale-specific sign-in route", async () => {
    state.accessToken = "";

    await DashboardPage({ params: Promise.resolve({ locale: "ar" }) });

    expect(state.redirect).toHaveBeenCalledWith("/ar/login");
  });
});
