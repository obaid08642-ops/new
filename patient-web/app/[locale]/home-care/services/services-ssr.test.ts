import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), access: vi.fn(), token: vi.fn(), catalog: vi.fn() }));
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
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.access, getOptionalPatientAccessToken: state.token }));
vi.mock("@/lib/api/nursing-catalog-server", () => ({ getPublicNursingCatalog: state.catalog }));
vi.mock("@/lib/api/home-care-services-server", () => ({ getPatientHomeCareServices: state.list, getPatientHomeCareService: state.detail, getPublicHomeCareServices: vi.fn().mockResolvedValue(null), getPublicHomeCareService: vi.fn().mockResolvedValue(null) }));
import HomeCareServicesPage from "./page";
import HomeCareServicePage from "./[serviceId]/page";

describe("home-care services SSR", () => {
  beforeEach(() => { state.list.mockReset().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); state.detail.mockReset(); state.access.mockReset().mockResolvedValue("server-access"); state.token.mockReset().mockResolvedValue("server-access"); state.catalog.mockReset().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); });
  it("renders protected list fields only", async () => { state.list.mockResolvedValue(new Response(JSON.stringify([{ id: "svc-1", name_en: "Home nursing", price: 120, patient_id: "private" }]), { status: 200 })); const html = renderToStaticMarkup(await HomeCareServicesPage({ params: Promise.resolve({ locale: "en" }) })); expect(state.list).toHaveBeenCalledWith("server-access"); expect(html).toContain("Home nursing"); expect(html).not.toContain("private"); expect(html).not.toContain("access-token"); });
  it("renders protected detail without creating a booking or fallback data", async () => { state.detail.mockResolvedValue(new Response(JSON.stringify({ data: { id: "svc-1", name_en: "Home nursing", description_en: "Verified description", patient_id: "private" } }), { status: 200 })); const html = renderToStaticMarkup(await HomeCareServicePage({ params: Promise.resolve({ locale: "en", serviceId: "svc-1" }) })); expect(state.detail).toHaveBeenCalledWith("svc-1", "server-access"); expect(html).toContain("Verified description"); expect(html).not.toContain("private"); expect(html).not.toContain("/home-care/bookings"); expect(html).not.toContain("calendar-check"); });
  it("draws no price or duration the server did not send", async () => { state.detail.mockResolvedValue(new Response(JSON.stringify({ data: { id: "svc-1", name_en: "Home nursing" } }), { status: 200 })); const html = renderToStaticMarkup(await HomeCareServicePage({ params: Promise.resolve({ locale: "en", serviceId: "svc-1" }) })); expect(html).not.toContain("SAR"); expect(html).not.toContain("Duration"); });
  describe("the service page is public (issue 650)", () => {
    const page = (serviceId = "svc-1") => HomeCareServicePage({ params: Promise.resolve({ locale: "en", serviceId }) });
    const catalog = (rows: unknown[]) => new Response(JSON.stringify(rows), { status: 200 });
    it("a visitor with no session reads the service out of the public catalog and never calls the protected endpoint", async () => {
      state.token.mockResolvedValue(undefined);
      state.catalog.mockResolvedValue(catalog([{ id: "svc-2", name_en: "Other" }, { id: "svc-1", name_en: "Wound care", description_en: "Public description", price: 80 }]));
      const html = renderToStaticMarkup(await page());
      expect(state.detail).not.toHaveBeenCalled();
      expect(html).toContain("Wound care");
      expect(html).toContain("Public description");
      expect(html).not.toContain("Other");
    });
    it("a patient whose session has ended (401) falls back to the catalog instead of being sent to sign-in", async () => {
      state.detail.mockResolvedValue(new Response("{}", { status: 401 }));
      state.catalog.mockResolvedValue(catalog([{ id: "svc-1", name_en: "Wound care" }]));
      expect(renderToStaticMarkup(await page())).toContain("Wound care");
    });
    it("a service the catalog does not list is not found, and an unreachable catalog is an error state, not a sign-in", async () => {
      const { notFound } = await import("next/navigation");
      state.token.mockResolvedValue(undefined);
      state.catalog.mockResolvedValue(catalog([{ id: "svc-2", name_en: "Other" }]));
      vi.mocked(notFound).mockImplementationOnce(() => { throw new Error("not-found"); });
      await expect(page("svc-9")).rejects.toThrow("not-found");
      state.catalog.mockResolvedValue(new Response("{}", { status: 503 }));
      expect(renderToStaticMarkup(await page())).toContain("Unable to load services");
    });
  });
});
