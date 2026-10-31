import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ doctors: vi.fn(), specialties: vi.fn() }));
vi.mock("@/lib/api/public-config-server", () => ({ getPublicConfig: async () => null }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/api/doctors-server", () => ({ getPublicDoctors: state.doctors }));
vi.mock("@/lib/api/specialties-cached", () => ({ getCachedSpecialties: state.specialties }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components-next/core/core-shell", async () => {
  const { createElement } = await import("react");
  return { CoreShell: ({ children }: { children: unknown }) => createElement("div", null, children as never) };
});
vi.mock("next/dynamic", async () => {
  const { ConsultState } = await import("@/components-next/consult/consult-state");
  return { default: () => ConsultState };
});

import { DoctorsView } from "./doctors-view";

const specialties = [
  { slug: "dermatology", name_ar: "جلدية", name_en: "Dermatology", count: 0 },
  { slug: "cardiology", name_ar: "قلب", name_en: "Cardiology", count: 9 },
  { slug: "pediatrics", name_ar: "أطفال", name_en: "Pediatrics", count: 14 },
];

describe("doctors page specialty row", () => {
  beforeEach(() => {
    state.doctors.mockReset();
    state.specialties.mockReset();
    state.specialties.mockImplementation(async () => new Response(JSON.stringify(specialties), { status: 200 }));
  });

  it("replaces the dropdown with the illustrated row: All first, most doctors first, All specialties last", async () => {
    state.doctors.mockResolvedValue(new Response(JSON.stringify([{ id: "d1", name_en: "A Doctor" }]), { status: 200 }));
    const html = renderToStaticMarkup(await DoctorsView({ params: Promise.resolve({ locale: "en" }) }));
    expect(html).not.toContain("<select");
    const labels = [...html.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1]);
    const row = labels.slice(labels.indexOf("specialtyAll"));
    expect(row.slice(0, 5)).toEqual(["specialtyAll", "pediatrics", "cardiology", "dermatology, comingSoon", "allSpecialties"]);
    expect(html).toContain('href="/en/consultations/doctors?specialty=cardiology"');
    expect(html).toContain('href="/en/consultations/specialties"');
  });

  it("a tile filters the list through the same specialty query the dropdown sent", async () => {
    state.doctors.mockResolvedValue(new Response(JSON.stringify([{ id: "d1", name_en: "A Doctor" }]), { status: 200 }));
    const html = renderToStaticMarkup(await DoctorsView({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ specialty: "cardiology", q: "x" }) }));
    expect(state.doctors).toHaveBeenCalledWith(expect.objectContaining({ specialty: "cardiology" }));
    expect(html).toMatch(/aria-current="true"[^>]*data-selected="true"[^>]*data-art="cardiology"/);
    expect(html).toContain('name="specialty" value="cardiology"');
  });

  it("a specialty with no doctor yet shows the coming-soon state, not a silent empty list", async () => {
    state.doctors.mockResolvedValue(new Response("[]", { status: 200 }));
    const html = renderToStaticMarkup(await DoctorsView({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ specialty: "dermatology" }) }));
    expect(html).toContain("comingSoonTitle");
    expect(html).toContain("comingSoonBody");
    expect(html).not.toContain("emptyTitle");
  });
});
