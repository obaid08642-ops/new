import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ services: vi.fn(), modalities: vi.fn() }));
vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServices: state.services, getPublicRadiologyModalities: state.modalities }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/lib/i18n", () => ({ isLocale: (value: string) => value === "en", locales: ["en"] }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
import RadiologyServicesPage from "./page";
const render = async (searchParams: Record<string, string>) => renderToStaticMarkup((await RadiologyServicesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve(searchParams) })) as never);
beforeEach(() => { state.services.mockReset(); state.modalities.mockReset(); state.modalities.mockResolvedValue(new Response(JSON.stringify(["mri", "xray"]), { status: 200 })); });
describe("Radiology Services SSR", () => {
  it("renders live services and forwards documented filters", async () => {
    state.services.mockResolvedValue(new Response(JSON.stringify([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", modality: "xray", price: 90 }]), { status: 200 }));
    const html = await render({ modality: "xray", home_visit: "1", search: "chest" });
    expect(html).toContain("Chest X-Ray");
    expect(html).toContain("/en/diagnostics/radiology/6a7600a27b25eeca204de283");
    expect(html).not.toContain("style=");
    expect(state.services).toHaveBeenCalledWith(expect.objectContaining({ modality: "xray", homeVisit: "true", search: "chest" }));
  });
  it("renders an alert when the live catalog fails", async () => {
    state.services.mockResolvedValue(new Response("", { status: 503 }));
    expect(await render({})).toMatch(/role="alert"/);
  });
});
