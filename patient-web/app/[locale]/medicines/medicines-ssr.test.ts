import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getPatientMedicines: vi.fn(),
  getPublicMedicine: vi.fn(),
  getPublicMedicines: vi.fn(),
  requirePatientAccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), permanentRedirect: vi.fn(), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
// the shell is a client frame (router, intl hooks, language and theme controls); this test is about the data boundary
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));
vi.mock("@/components-next/core/core-states", () => ({ RetryErrorState: () => null }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, getDirection: () => "ltr" }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/medicines-server", () => ({ getPatientMedicines: state.getPatientMedicines }));
vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicine: state.getPublicMedicine, getPublicMedicines: state.getPublicMedicines }));

import MedicinesPage from "./page";
import MedicineDetailPage from "./[medicineId]/page";

const medicineId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-medicine-access-token-never-in-html";

describe("medicines SSR boundary", () => {
  beforeEach(() => {
    state.getPatientMedicines.mockReset();
    state.getPublicMedicine.mockReset();
    state.getPublicMedicines.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("permanently redirects the old medicines list to the canonical catalogue, keeping the category, search words and page", async () => {
    const { permanentRedirect } = await import("next/navigation");

    await MedicinesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "catalog", page: "2", category: "vitamins", sort: "trending" }) });

    expect(permanentRedirect).toHaveBeenCalledWith("/en/c/vitamins?q=catalog&page=2");
    expect(state.requirePatientAccess).not.toHaveBeenCalled();
    expect(state.getPublicMedicines).not.toHaveBeenCalled();
  });

  it("redirects the legacy medicine detail URL to the canonical v14 product page without a patient session", async () => {
    const { redirect } = await import("next/navigation");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ slug: "catalog-medicine-500-mg" }), { status: 200 })));

    await MedicineDetailPage({ params: Promise.resolve({ locale: "en", medicineId }) });

    expect(redirect).toHaveBeenCalledWith("/en/p/catalog-medicine-500-mg");
    expect(state.requirePatientAccess).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
