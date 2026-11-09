import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPublicSpecialties: vi.fn() }));
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) =>
    // the page reads the FAQ with t.has (t.raw throws on precompiled messages): no FAQ keys in this mock
    Object.assign((key: string) => (namespace === "SpecialtyNames" ? `NAME(${key})` : key), { has: (_key: string) => false }),
  setRequestLocale: vi.fn(),
}));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/api/specialties-server", () => ({ getPublicSpecialties: state.getPublicSpecialties }));

vi.mock("@/components-next/core/core-shell", async () => {
  const { createElement } = await import("react");
  return { CoreShell: ({ children, backHref }: { children: unknown; backHref?: string }) => createElement("div", { "data-shell": true }, createElement("a", { href: backHref }, "back"), children as never) };
});

import SpecialtySelectPage from "./page";

describe("specialties SSR boundary", () => {
  beforeEach(() => state.getPublicSpecialties.mockReset());

  it("renders only parsed public display fields without a private session token", async () => {
    state.getPublicSpecialties.mockResolvedValue(new Response(JSON.stringify({ data: [{ slug: "cardiology", name_ar: "قلب", name_en: "Cardiology", count: 7, patient_id: "private-patient" }] }), { status: 200 }));
    const html = renderToStaticMarkup(await SpecialtySelectPage({ params: Promise.resolve({ locale: "en" }) }));
    // a slug this build knows is named by the message of the page's language (six languages), not by the server's text
    expect(html).toContain("NAME(cardiology)");
    expect(html).not.toContain(">Cardiology<");
    // the doctors list reads the specialty slug (#1708), not the Arabic name
    expect(html).toContain("/en/consultations/doctors?specialty=cardiology");
    expect(html).not.toContain("private-patient");
    expect(html).not.toContain("access-token");
  });

  it("shows the server's own name for a slug this build has no message for", async () => {
    state.getPublicSpecialties.mockResolvedValue(new Response(JSON.stringify({ data: [{ slug: "future_specialty", name_ar: "جديد", name_en: "Future care", count: 1 }] }), { status: 200 }));
    const html = renderToStaticMarkup(await SpecialtySelectPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(html).toContain("Future care");
    expect(html).not.toContain("NAME(future_specialty)");
  });

  it("orders specialties with doctors first, keeps the ones without as normal tiles (no coming-soon label), and searches by name", async () => {
    const rows = [
      { slug: "dermatology", name_ar: "جلدية", name_en: "Dermatology", count: 0 },
      { slug: "cardiology", name_ar: "قلب", name_en: "Cardiology", count: 7 },
    ];
    state.getPublicSpecialties.mockResolvedValue(new Response(JSON.stringify({ data: rows }), { status: 200 }));
    const html = renderToStaticMarkup(await SpecialtySelectPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(html.indexOf("NAME(cardiology)")).toBeLessThan(html.indexOf("NAME(dermatology)"));
    expect(html).toContain("NAME(dermatology)");
    expect(html).not.toMatch(/soon/i);
    state.getPublicSpecialties.mockResolvedValue(new Response(JSON.stringify({ data: rows }), { status: 200 }));
    const found = renderToStaticMarkup(await SpecialtySelectPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "جلد" }) }));
    expect(found).toContain("NAME(dermatology)");
    expect(found).not.toContain("NAME(cardiology)");
  });

  it("does not render fallback specialties on upstream failure", async () => {
    state.getPublicSpecialties.mockResolvedValue(null);
    const html = renderToStaticMarkup(await SpecialtySelectPage({ params: Promise.resolve({ locale: "ar" }) }));
    expect(html).toContain("unavailableTitle");
    expect(html).not.toContain("Cardiology");
  });
});
