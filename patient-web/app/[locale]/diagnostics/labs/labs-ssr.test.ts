import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ getPublicLabServices: vi.fn() }));
vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/lib/i18n", () => ({ isLocale: (value: string) => value === "en", locales: ["en"] }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import LabsServicesPage from "./page";

// the page returns the async <LabsCatalog>, which a test renders by calling it
async function render(searchParams = {}) {
  const element = (await LabsServicesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve(searchParams) })) as unknown as { type: (props: unknown) => Promise<never>; props: unknown };
  return renderToStaticMarkup(await element.type(element.props));
}

describe("Labs Services SSR", () => {
  it("renders live catalog data only", async () => {
    state.getPublicLabServices.mockResolvedValue(new Response(JSON.stringify([{ id: "cbc", name_en: "CBC", price: 20 }]), { status: 200 }));
    const html = await render();
    expect(html).toContain("CBC");
    expect(html).toContain("/en/diagnostics/labs/book?serviceId=cbc");
    expect(html).not.toContain("style=");
    expect(state.getPublicLabServices).toHaveBeenCalledWith({ search: "", homeOnly: false });
  });
  it("renders an alert state when the live endpoint fails", async () => {
    state.getPublicLabServices.mockResolvedValue(new Response("", { status: 503 }));
    expect(await render()).toMatch(/role="alert"/);
  });
});
