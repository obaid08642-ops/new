import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getPatientMedicines: vi.fn(),
  getPublicMedicine: vi.fn(),
  requirePatientAccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/medicines-server", () => ({ getPatientMedicines: state.getPatientMedicines }));
vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicine: state.getPublicMedicine }));

import MedicinesPage from "./page";
import MedicineDetailPage from "./[medicineId]/page";

const medicineId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-medicine-access-token-never-in-html";

describe("medicines SSR boundary", () => {
  beforeEach(() => {
    state.getPatientMedicines.mockReset();
    state.getPublicMedicine.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders bounded catalog results through the server boundary without embedding the token", async () => {
    state.getPatientMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: medicineId, name_en: "Catalog medicine", active_ingredient: "Ingredient", price: 99 }]), { status: 200 }));

    const html = renderToStaticMarkup(await MedicinesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "catalog", page: "1" }) }));

    expect(state.getPatientMedicines).toHaveBeenCalledWith(serverToken, { q: "catalog", page: 1 });
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("99");
    expect(html).toContain(`/en/medicines/${medicineId}`);
  });

  it("renders published medicine detail through the public allowlist without a patient session or a price", async () => {
    state.getPublicMedicine.mockResolvedValue(new Response(JSON.stringify({ id: medicineId, name_en: "Catalog medicine", active_ingredient: "Ingredient", price: 99, patient_id: "private-patient" }), { status: 200 }));

    const html = renderToStaticMarkup(await MedicineDetailPage({ params: Promise.resolve({ locale: "en", medicineId }) }));

    expect(state.getPublicMedicine).toHaveBeenCalledWith(medicineId);
    expect(state.requirePatientAccess).not.toHaveBeenCalled();
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("99");
    expect(html).not.toContain("private-patient");
  });
});
