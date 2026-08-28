import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPublicSpecialties: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/api/specialties-server", () => ({ getPublicSpecialties: state.getPublicSpecialties }));

import SpecialtySelectPage from "./page";

describe("specialties SSR boundary", () => {
  beforeEach(() => state.getPublicSpecialties.mockReset());

  it("renders only parsed public display fields without a private session token", async () => {
    state.getPublicSpecialties.mockResolvedValue(new Response(JSON.stringify({ data: [{ slug: "cardiology", name_ar: "قلب", name_en: "Cardiology", count: 7, patient_id: "private-patient" }] }), { status: 200 }));
    const html = renderToStaticMarkup(await SpecialtySelectPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(html).toContain("Cardiology");
    expect(html).toContain("/en/appointments?specialty=%D9%82%D9%84%D8%A8");
    expect(html).not.toContain("private-patient");
    expect(html).not.toContain("access-token");
  });

  it("does not render fallback specialties on upstream failure", async () => {
    state.getPublicSpecialties.mockResolvedValue(null);
    const html = renderToStaticMarkup(await SpecialtySelectPage({ params: Promise.resolve({ locale: "ar" }) }));
    expect(html).toContain("unavailableTitle");
    expect(html).not.toContain("Cardiology");
  });
});
