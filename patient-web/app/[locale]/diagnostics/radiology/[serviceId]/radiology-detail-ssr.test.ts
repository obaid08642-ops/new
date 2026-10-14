import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ detail: vi.fn() }));
vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServiceDetail: state.detail }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/lib/i18n", () => ({ isLocale: (value: string) => value === "en", locales: ["en"] }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import RadiologyServiceDetailPage from "./page";

describe("Radiology detail SSR", () => {
  beforeEach(() => state.detail.mockReset());

  it("loads detail by the primary id and renders bounded fields", async () => {
    state.detail.mockResolvedValue(new Response(JSON.stringify({ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", modality: "xray", price: 90, preparation_en: ["Bring prior reports"] }), { status: 200 }));
    const html = renderToStaticMarkup((await RadiologyServiceDetailPage({ params: Promise.resolve({ locale: "en", serviceId: "6a7600a27b25eeca204de283" }) })) as never);
    expect(html).toContain("Chest X-Ray");
    expect(html).toContain("Bring prior reports");
    expect(html).toContain("add=rad_6a7600a27b25eeca204de283");
    expect(html).not.toContain("style=");
    expect(state.detail).toHaveBeenCalledWith("6a7600a27b25eeca204de283");
  });

  it("does not render a fake detail when the live endpoint returns 404", async () => {
    state.detail.mockResolvedValue(new Response(JSON.stringify({ message: "not_found" }), { status: 404 }));
    await expect(RadiologyServiceDetailPage({ params: Promise.resolve({ locale: "en", serviceId: "missing-service" }) })).rejects.toThrow("NOT_FOUND");
  });
});
