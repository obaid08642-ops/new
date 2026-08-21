import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), requirePatientAccess: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async (namespace: string) => (key: string) => `${namespace}.${key}`, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
import CartPage from "./page";
import CartCheckoutPreviewPage from "./checkout/page";

describe("cart SSR boundary", () => {
  beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue("server-only-cart-token"); state.callPatientApi.mockReset(); });
  it("renders only bounded cart fields without token or private metadata", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ patient_id: "private-patient", groups: [{ kind: "pharmacy", count: 1, subtotal: 12, items: [{ line_id: "line-1", service_id: "med-1", name_ar: "Medicine", qty: 2, price: 6, notes: "private-notes", meta: { private: true } }] }], subtotal: 12, total: 12, currency: "SAR" }), { status: 200 }));
    const html = renderToStaticMarkup(await CartPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(state.callPatientApi).toHaveBeenCalledWith("/cart", {}, "server-only-cart-token");
    expect(html).toContain("Medicine");
    for (const secret of ["server-only-cart-token", "private-patient", "private-notes", "private"]) expect(html).not.toContain(secret);
  });

  it("renders checkout totals as a read-only preview without payment mutation", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ patient_id: "private-patient", subtotal: 12, home_visit_fee: 0, total: 12, currency: "SAR", notes: "private" }), { status: 200 }));
    const html = renderToStaticMarkup(await CartCheckoutPreviewPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(state.callPatientApi).toHaveBeenCalledWith("/cart/checkout", {}, "server-only-cart-token");
    expect(html).toContain("12");
    expect(html).not.toContain("private-patient");
    expect(html).not.toContain("private");
    expect(html).not.toContain("payment");
  });
});
