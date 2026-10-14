import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPublicLabServices: vi.fn(), getPublicLabPackage: vi.fn() }));
vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices, getPublicLabPackage: state.getPublicLabPackage }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/lib/i18n", () => ({ isLocale: (value: string) => value === "en", locales: ["en"] }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import LabsPackagesPage from "./page";
import LabPackageDetailPage from "./[packageId]/page";

describe("Labs Packages SSR", () => {
  it("renders only live package rows and links to detail", async () => {
    state.getPublicLabServices.mockResolvedValue(new Response(JSON.stringify([{ id: "pkg-1", name_en: "Wellness panel", is_package: true, included_services: ["cbc"] }]), { status: 200 }));
    const html = renderToStaticMarkup((await LabsPackagesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) })) as never);
    expect(html).toContain("Wellness panel");
    expect(html).toContain('href="/en/diagnostics/packages/pkg-1"');
  });
  it("renders package detail facts from the live endpoint and books through the real booking page", async () => {
    state.getPublicLabPackage.mockResolvedValue(new Response(JSON.stringify({ id: "pkg-1", name_en: "Wellness panel", is_package: true, price: 120, included_services: ["cbc", "tsh"], preparation_en: ["Bring your request"] }), { status: 200 }));
    const html = renderToStaticMarkup((await LabPackageDetailPage({ params: Promise.resolve({ locale: "en", packageId: "pkg-1" }) })) as never);
    expect(html).toContain("Wellness panel");
    expect(html).toContain("Bring your request");
    expect(html).toContain("/en/diagnostics/labs/book?serviceId=pkg-1");
    expect(html).toContain("/en/diagnostics/cart?add=pkg-1&amp;name=Wellness%20panel&amp;price=120");
    expect(html).not.toContain("style=");
  });
});
