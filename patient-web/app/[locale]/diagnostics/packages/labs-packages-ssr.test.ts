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
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify([{ id: "pkg-1", name_en: "Wellness panel", is_package: true, included_services: ["cbc"], category: "cardiac" }, { id: "pkg-2", name_en: "Bone panel", category: "bone" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const html = renderToStaticMarkup((await LabsPackagesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) })) as never);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/labs/packages");
    expect(html).toContain("Wellness panel");
    expect(html).toContain('href="/en/diagnostics/packages/pkg-1"');
    // the search and the category narrow the list in place
    const narrowed = renderToStaticMarkup((await LabsPackagesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "bone" }) })) as never);
    expect(narrowed).toContain("Bone panel");
    expect(narrowed).not.toContain("Wellness panel");
  });
  it("renders package detail facts from the live endpoint and books through the cart (one booking path)", async () => {
    state.getPublicLabPackage.mockResolvedValue(new Response(JSON.stringify({ id: "pkg-1", name_en: "Wellness panel", is_package: true, price: 120, included_services: ["cbc", "tsh"], preparation_en: ["Bring your request"] }), { status: 200 }));
    const html = renderToStaticMarkup((await LabPackageDetailPage({ params: Promise.resolve({ locale: "en", packageId: "pkg-1" }) })) as never);
    expect(html).toContain("Wellness panel");
    expect(html).toContain("Bring your request");
    expect(html).not.toContain("/en/diagnostics/labs/book"); // journeys#50: one booking path, the cart
    expect(html).toContain("/en/labs/pkg-1?kind=lab");
    expect(html).not.toContain("style=");
  });
});
