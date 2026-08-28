import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPublicLabServices: vi.fn() }));
vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: (value: string) => value === "en" }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

import LabsServicesPage from "./page";

function containsRole(value: unknown, role: string): boolean {
  if (!value || typeof value !== "object") return false;
  const node = value as { props?: { role?: string; children?: unknown } };
  if (node.props?.role === role) return true;
  const children = node.props?.children;
  return Array.isArray(children) ? children.some((child) => containsRole(child, role)) : containsRole(children, role);
}

describe("Labs Services SSR", () => {
  it("renders live catalog data only", async () => {
    state.getPublicLabServices.mockResolvedValue(new Response(JSON.stringify([{ id: "cbc", name_en: "CBC", price: 20 }]), { status: 200 }));
    const result = await LabsServicesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) });
    expect(JSON.stringify((result as { props?: unknown }).props ?? {})).toContain("CBC");
    expect(state.getPublicLabServices).toHaveBeenCalledWith({ search: "", homeOnly: false });
  });
  it("renders an alert state when the live endpoint fails", async () => {
    state.getPublicLabServices.mockResolvedValue(new Response("", { status: 503 }));
    const result = await LabsServicesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) });
    expect(containsRole(result, "alert")).toBe(true);
  });
});
