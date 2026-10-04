// WP-K: "orders from your doctor" on the website read a ?payload= nothing ever
// sent (an orphan page). It now reads GET /patient/doctor-orders, and each
// ordered service links to its real booking flow.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ call: vi.fn(), access: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.access }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.call }));
vi.mock("@/components-next/retry-button", () => ({ RetryButton: () => null }));

import Page from "./page";

describe("doctor orders page (WP-K)", () => {
  beforeEach(() => { state.access.mockReset().mockResolvedValue("tok"); state.call.mockReset(); });

  it("lists the patient's doctor orders with real booking links", async () => {
    state.call.mockResolvedValue(new Response(JSON.stringify([
      { id: "o1", kind: "lab", status: "open", notes: "fasting", items: [{ service_id: "cbc", name_ar: "تعداد دم", name_en: "CBC" }] },
      { id: "o2", kind: "radiology", status: "open", items: [{ service_id: "xray", name_en: "Chest X-ray" }] },
      { id: "o3", kind: "nursing", status: "open", items: [{ service_id: "wound", name_en: "Wound care" }] },
    ]), { status: 200 }));
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "en" }) }));
    expect(state.call).toHaveBeenCalledWith("/patient/doctor-orders", {}, "tok");
    expect(html).toContain("CBC");
    expect(html).toContain("/en/diagnostics/cart?add=cbc");
    expect(html).toContain("/en/diagnostics/cart?add=rad_xray");
    expect(html).toContain("/en/home-care/services/wound");
    expect(html).toContain("fasting");
  });

  it("an empty list shows the empty state, a failure shows an error", async () => {
    state.call.mockResolvedValue(new Response("[]", { status: 200 }));
    expect(renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "en" }) }))).toContain("empty");
    state.call.mockResolvedValue(new Response("{}", { status: 503 }));
    expect(renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "en" }) }))).toContain("unavailable");
  });
});
