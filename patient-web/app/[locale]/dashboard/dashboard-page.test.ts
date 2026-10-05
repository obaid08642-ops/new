import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ access: true, redirect: vi.fn(), profile: vi.fn(), appointment: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => state.access ? { value: "test-access-token" } : undefined }) }));
vi.mock("next/navigation", () => ({ redirect: state.redirect, useRouter: () => ({ push: vi.fn() }), usePathname: () => "/ar/dashboard" }));
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/i18n")>()), isLocale: () => true }));
// The page reads the backend through these two calls; the shell test answers them like a healthy backend (without them
// the page would call the real service, which is unreachable here and, rightly, shows the error state).
vi.mock("@/lib/api/dashboard-server", () => ({ getPatientDashboardProfile: state.profile, getPatientDashboardUpcomingAppointment: state.appointment }));
import DashboardPage from "./page";
import { HomeShell } from "@/components-next/home/home-shell";
describe("patient dashboard visual shell", () => {
  beforeEach(() => {
    state.access = true;
    state.redirect.mockReset();
    state.profile.mockReset().mockResolvedValue(new Response(JSON.stringify({ display_name: "Verified patient" }), { status: 200 }));
    state.appointment.mockReset().mockResolvedValue(new Response("", { status: 200 }));
  });
  it("renders the reference-inspired private dashboard without embedding the session token", async () => {
    const element = (await DashboardPage({ params: Promise.resolve({ locale: "ar" }) })) as { props: Parameters<typeof HomeShell>[0] };
    const html = renderToStaticMarkup(await HomeShell(element.props));
    expect(html).toContain("nabd-service-tile");
    expect(html).toContain('href="/ar/appointments"');
    expect(html).toContain('href="/ar/notifications"');
    expect(html).toContain('href="/ar/profile"');
    expect(html).not.toContain("test-access-token");
  }, 15000);
});
