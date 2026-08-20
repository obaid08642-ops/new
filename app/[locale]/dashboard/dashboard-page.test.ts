import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ access: true, redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => state.access ? { value: "test-access-token" } : undefined }) }));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
import DashboardPage from "./page";
describe("patient dashboard visual shell", () => { beforeEach(() => { state.access = true; state.redirect.mockReset(); }); it("renders the reference-inspired private dashboard without embedding the session token", async () => { const html = renderToStaticMarkup(await DashboardPage({ params: Promise.resolve({ locale: "ar" }) })); expect(html).toContain("quickTile"); expect(html).toContain('href="/ar/appointments"'); expect(html).toContain('href="/ar/notifications"'); expect(html).toContain('href="/ar/profile"'); expect(html).not.toContain("test-access-token"); }); });
