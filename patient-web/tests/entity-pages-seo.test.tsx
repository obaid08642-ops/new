import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Owner 2026-10-12 (SEO/GEO/AEO): for every public entity type and every locale, the page has its
 * own translated title and description, a canonical with the six hreflang alternates and x-default,
 * the right JSON-LD, and a direct answer right under the title built from the entity's own fields.
 */
vi.mock("next-intl/server", () => ({
  getTranslations: async (arg?: string | { locale: string; namespace: string }) => {
    const ns = typeof arg === "string" ? arg : arg?.namespace ?? "";
    return (key: string, values?: Record<string, unknown>) => `${ns}.${key}${values ? `(${Object.values(values).join("|")})` : ""}`;
  },
  setRequestLocale: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "ar" }));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));
vi.mock("@/lib/auth/session", () => ({ getOptionalPatientAccessToken: async () => undefined, requirePatientAccess: async () => "t" }));

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

const ROUTES: Array<[RegExp, unknown]> = [
  [/\/entity-graph\/related\/doctor\/dr-sara$/, { entity: { id: "d1", slug: "dr-sara", name_ar: "د. سارة", name_en: "Dr Sara", specialty: "cardiology", city: "Riyadh", rating: null, consultation_modes: ["clinic", "video"] }, relationships: { facility: { name_ar: "مستشفى", name_en: "KFSH" }, accepted_insurance: [] } }],
  [/\/entity-graph\/related\/facility\/kfsh$/, { entity: { name_ar: "مستشفى الملك", name_en: "King Hospital", type: "hospital", city: "Riyadh" }, relationships: { departments: [], doctors: [{ id: "d1" }, { id: "d2" }] } }],
  [/\/entity-graph\/related\/pharmacy\/al-dawaa$/, { entity: { id: "ph1", name_ar: "صيدلية الدواء", name_en: "Al Dawaa", city: "Jeddah" }, relationships: {} }],
  [/\/radiology\/services\/r1$/, { id: "r1", name_ar: "رنين مغناطيسي", name_en: "MRI brain", modality: "mri", description_en: "Magnetic resonance of the brain." }],
  [/\/nursing\/catalog$/, { items: [{ id: "h1", name_ar: "العناية بالجروح", name_en: "Wound care", price: 150 }] }],
  [/\/articles\/vitamin-d-a1$/, { slug: "vitamin-d-a1", title_ar: "فيتامين د", title_en: "Vitamin D", excerpt_ar: "ملخص", excerpt_en: "Summary of the article.", published_at: "2026-09-01" }],
  [/\/entity-graph\/related\/condition\/headache$/, { entity: { code: "headache", name_ar: "الصداع", name_en: "Headache", overview_ar: "الصداع ألم في الرأس.", overview_en: "A headache is pain in the head.", symptoms: [] }, relationships: { doctors: [], relevant_medicines: [] } }],
  [/\/labs\/services\?limit=100$/, { items: [{ id: "l1", short_code: "CBC", name_ar: "صورة دم كاملة", name_en: "Complete blood count" }] }],
  [/\/entity-graph\/explore\?city=riyadh$/, { facilities: [{ id: "f1", name_ar: "مختبر", name_en: "Lab one", city: "Riyadh" }], doctors: [] }],
];

function stubBackend() {
  vi.stubGlobal("fetch", vi.fn(async (input: unknown) => {
    const url = String(input);
    const hit = ROUTES.find(([re]) => re.test(url));
    return hit ? ok(hit[1]) : new Response("{}", { status: 404 });
  }));
}
afterEach(() => { vi.unstubAllGlobals(); });

type PageModule = { default: (p: { params: Promise<Record<string, string>> }) => Promise<unknown>; generateMetadata: (p: { params: Promise<Record<string, string>> }) => Promise<Record<string, any>> };

const PAGES: Array<{ type: string; load: () => Promise<PageModule>; params: Record<string, string>; path: string; ld: string[]; answer: RegExp; title: RegExp }> = [
  { type: "doctor", load: () => import("@/app/[locale]/doctor/[slug]/page") as Promise<PageModule>, params: { slug: "dr-sara" }, path: "/doctor/dr-sara", ld: ["Physician", "MedicalWebPage", "BreadcrumbList"], answer: /SeoAnswer\.doctorWho.*SeoAnswer\.doctorModes.*SeoAnswer\.doctorBook/, title: /Dr Sara|د\. سارة/ },
  { type: "facility", load: () => import("@/app/[locale]/facility/[slug]/page") as Promise<PageModule>, params: { slug: "kfsh" }, path: "/facility/kfsh", ld: ["Hospital", "MedicalWebPage", "BreadcrumbList"], answer: /SeoAnswer\.facilityWho.*SeoAnswer\.facilityDoctors\(2\)/, title: /King Hospital|مستشفى الملك/ },
  { type: "pharmacy", load: () => import("@/app/[locale]/pharmacy/[slug]/page") as Promise<PageModule>, params: { slug: "al-dawaa" }, path: "/pharmacy/al-dawaa", ld: ["Pharmacy", "MedicalWebPage", "BreadcrumbList"], answer: /SeoAnswer\.pharmacyWho.*SeoAnswer\.pharmacyHow/, title: /Al Dawaa|صيدلية الدواء/ },
  { type: "radiology", load: () => import("@/app/[locale]/diagnostics/radiology/[serviceId]/page") as Promise<PageModule>, params: { serviceId: "r1" }, path: "/diagnostics/radiology/r1", ld: ["ImagingTest", "MedicalWebPage", "Service", "BreadcrumbList"], answer: /SeoAnswer\.radiologyWho/, title: /MRI brain|رنين مغناطيسي/ },
  { type: "home care", load: () => import("@/app/[locale]/home-care/services/[serviceId]/page") as Promise<PageModule>, params: { serviceId: "h1" }, path: "/home-care/services/h1", ld: ["MedicalProcedure", "MedicalWebPage", "BreadcrumbList"], answer: /SeoAnswer\.homeCareWho/, title: /Wound care|العناية بالجروح/ },
  { type: "article", load: () => import("@/app/[locale]/articles/[slug]/page") as Promise<PageModule>, params: { slug: "vitamin-d-a1" }, path: "/articles/vitamin-d-a1", ld: ["Article", "MedicalWebPage", "BreadcrumbList"], answer: /Summary of the article\.|ملخص/, title: /Vitamin D|فيتامين د/ },
  { type: "lab test", load: () => import("@/app/[locale]/labs/[testSlug]/[citySlug]/page") as Promise<PageModule>, params: { testSlug: "CBC", citySlug: "riyadh" }, path: "/labs/CBC/riyadh", ld: ["MedicalTest", "MedicalWebPage", "BreadcrumbList"], answer: /SeoAnswer\.labWho\((Complete blood count|صورة دم كاملة)\|riyadh\)/, title: /Complete blood count|صورة دم كاملة/ },
  { type: "condition", load: () => import("@/app/[locale]/condition/[slug]/page") as Promise<PageModule>, params: { slug: "headache" }, path: "/condition/headache", ld: ["MedicalCondition", "MedicalWebPage", "BreadcrumbList"], answer: /A headache is pain in the head\.|الصداع ألم في الرأس\./, title: /Headache|الصداع/ },
];

describe.each(PAGES)("$type page", ({ load, params, path, ld, answer, title }) => {
  it.each(LOCALES)("%s: own title, canonical, six hreflang + x-default, indexable", async (locale) => {
    stubBackend();
    const mod = await load();
    const meta = await mod.generateMetadata({ params: Promise.resolve({ locale, ...params }) });
    expect(String(meta.title)).toMatch(title);
    expect(String(meta.description || "").length).toBeGreaterThan(0);
    expect(meta.alternates.canonical).toBe(`https://nabd.plus/${locale}${path}`);
    for (const l of LOCALES) expect(meta.alternates.languages[l]).toBe(`https://nabd.plus/${l}${path}`);
    expect(meta.alternates.languages["x-default"]).toBe(`https://nabd.plus/ar${path}`);
    expect(meta.robots).toMatchObject({ index: true, follow: true });
  });

  it.each(LOCALES)("%s: JSON-LD types and the direct answer under the title", async (locale) => {
    stubBackend();
    const mod = await load();
    const html = renderToStaticMarkup((await mod.default({ params: Promise.resolve({ locale, ...params }) })) as React.ReactElement);
    for (const type of ld) expect(html).toContain(`"@type":"${type}"`);
    expect(html).toMatch(/class="nabd-direct-answer[^"]*"[^>]*>[^<]+</);
    expect(html).toMatch(answer);
    expect(html).toContain('".nabd-direct-answer"');
    expect(html).not.toMatch(/4\.8|"ratingValue"/); // no invented rating
  });
});

describe("pages that must not be indexed on their own", () => {
  it("a doctor's city variant points at the doctor's page and is noindex", async () => {
    stubBackend();
    const mod = (await import("@/app/[locale]/doctor/[slug]/page")) as PageModule;
    const meta = await mod.generateMetadata({ params: Promise.resolve({ locale: "en", slug: "dr-sara", city: "jeddah" }) });
    expect(meta.alternates.canonical).toBe("https://nabd.plus/en/doctor/dr-sara");
    expect(meta.robots).toMatchObject({ index: false });
  });

  it("an unknown lab test has no page", async () => {
    stubBackend();
    const mod = (await import("@/app/[locale]/labs/[testSlug]/[citySlug]/page")) as PageModule;
    expect((await mod.generateMetadata({ params: Promise.resolve({ locale: "en", testSlug: "made-up-test", citySlug: "riyadh" }) })).robots).toMatchObject({ index: false });
    await expect(mod.default({ params: Promise.resolve({ locale: "en", testSlug: "made-up-test", citySlug: "riyadh" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("a pharmacy slug that is not a reviewed pharmacy is a 404 (no fallback to a doctor)", async () => {
    stubBackend();
    const mod = (await import("@/app/[locale]/pharmacy/[slug]/page")) as PageModule;
    await expect(mod.default({ params: Promise.resolve({ locale: "ar", slug: "dr-sara" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("the noindex header (proxy) lets every public detail page through, and no signed-in screen", () => {
  it("public detail pages are indexable, the signed-in pharmacy screens are not", async () => {
    const { isPublicIndexable } = await import("@/lib/seo/public-indexable");
    for (const l of LOCALES) {
      for (const p of ["/pharmacy/al-dawaa", "/home-care/services/h1", "/diagnostics/packages", "/diagnostics/packages/p1", "/consultations/specialties", "/doctor/dr-sara", "/facility/kfsh", "/p/x", "/articles/a"]) {
        expect([p, isPublicIndexable(`/${l}${p}`)]).toEqual([p, true]);
      }
    }
    const { readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const screens = readdirSync(join(process.cwd(), "app/[locale]/pharmacy"), { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("[")).map((d) => d.name);
    expect(screens.length).toBeGreaterThan(5);
    for (const s of screens) expect([s, isPublicIndexable(`/ar/pharmacy/${s}`)]).toEqual([s, false]);
    expect(isPublicIndexable("/ar/home-care/bookings")).toBe(false);
  });
});
