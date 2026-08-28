import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ detail: vi.fn() }));
vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServiceDetail: state.detail }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: (value: string) => value === "en" }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));

import RadiologyServiceDetailPage from "./page";

function hasText(value: unknown, text: string): boolean {
  if (typeof value === "string") return value.includes(text);
  if (!value || typeof value !== "object") return false;
  const node = value as { props?: { children?: unknown } };
  const children = node.props?.children;
  return Array.isArray(children) ? children.some((child) => hasText(child, text)) : hasText(children, text);
}

describe("Radiology detail SSR", () => {
  beforeEach(() => state.detail.mockReset());

  it("loads detail by the primary id and renders bounded fields", async () => {
    state.detail.mockResolvedValue(new Response(JSON.stringify({ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", modality: "xray", price: 90, preparation_en: ["Bring prior reports"] }), { status: 200 }));
    const result = await RadiologyServiceDetailPage({ params: Promise.resolve({ locale: "en", serviceId: "6a7600a27b25eeca204de283" }) });
    expect(hasText(result, "Chest X-Ray")).toBe(true);
    expect(state.detail).toHaveBeenCalledWith("6a7600a27b25eeca204de283");
  });

  it("does not render a fake detail when the live endpoint returns 404", async () => {
    state.detail.mockResolvedValue(new Response(JSON.stringify({ message: "not_found" }), { status: 404 }));
    await expect(RadiologyServiceDetailPage({ params: Promise.resolve({ locale: "en", serviceId: "missing-service" }) })).rejects.toThrow("NOT_FOUND");
  });
});
