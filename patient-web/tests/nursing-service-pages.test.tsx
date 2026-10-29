import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(",")}` : key),
  setRequestLocale: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));
// a client component (it reads the visitor's session): the page only has to place it with the service it is for
vi.mock("@/components-next/diagnostics/notify-me-button", () => ({ NotifyMeButton: ({ serviceType, serviceId }: { serviceType: string; serviceId: string }) => <button data-notify={`${serviceType}:${serviceId}`}>notify</button> }));

import Page, { generateMetadata } from "../app/[locale]/home-nursing/[citySlug]/[serviceSlug]/page";
import { citiesOf, priceRange, publicNursingServices, serviceForToken, serviceTokens, slugOf } from "@/lib/nursing/service-pages";

/** What GET /home-care/services answers: two real services, one row that was merged into another (catalogue-duplicates), one repeated name, one not approved. */
const CATALOGUE = [
  { id: "svc-iv", name_en: "IV Drip at Home", name_ar: "محلول وريدي منزلي", price: 250, providers_count: 2, from_price: 220, home_available: true },
  { id: "svc-wound", name_en: "Wound care", name_ar: "العناية بالجروح", price: 120, providers_count: 0, from_price: null },
  { id: "svc-iv-old", name_en: "IV Drip at Home", name_ar: "محلول وريدي منزلي", price: 250, merged_into: "svc-iv" },
  { id: "svc-iv-copy", name_en: "iv drip at  home", name_ar: "محلول وريدي منزلي" },
  { id: "svc-pending", name_en: "Pending thing", medical_review_status: "pending" },
  { id: "svc-gone", name_en: "Deleted thing", is_deleted: true },
];
const DETAIL_IV = { ...CATALOGUE[0], offers: [
  { provider: { id: "n1", name_en: "Nurse A" }, price: 220, currency: "SAR", home: true },
  { provider: { id: "n2", name_en: "Nurse B" }, price: 300, currency: "SAR", home: true },
] };
const CITIES = [{ code: "sa-riyadh", name_ar: "الرياض", name_en: "Riyadh" }, { code: "sa-jeddah", name_ar: "جدة", name_en: "Jeddah" }, { code: "sa-old", name_en: "Old", is_deleted: true }];

function backend(down = false) {
  vi.stubGlobal("fetch", vi.fn(async (input: unknown) => {
    const url = new URL(String(input));
    const key = url.pathname.replace(/^\/api\/v1/, "");
    if (down) return new Response("down", { status: 503 });
    if (key === "/home-care/services") return Response.json(CATALOGUE);
    if (key === "/home-care/services/svc-iv") return Response.json(DETAIL_IV);
    if (key.startsWith("/home-care/services/")) return Response.json({ ...CATALOGUE.find((r) => key.endsWith(r.id)) });
    if (key === "/locations/cities") return Response.json(CITIES);
    return new Response("not found", { status: 404 });
  }));
}
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

const props = (city: string, service: string, locale = "en") => ({ params: Promise.resolve({ locale, citySlug: city, serviceSlug: service }) });
const ldOf = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap((m) => JSON.parse(m[1].replace(/\\u003c/g, "<")));

describe("which catalogue rows get a page", () => {
  it("keeps approved, non-merged, non-duplicate services once, in the catalogue's order", () => {
    expect(publicNursingServices(CATALOGUE).map((s) => s.id)).toEqual(["svc-iv", "svc-wound"]);
  });

  it("gives each service its own slug, else the slug of its English name, else its id, and never the same URL twice", () => {
    const services = publicNursingServices([...CATALOGUE.slice(0, 2), { id: "svc-x", slug: "wound-care", name_en: "Another wound service" }, { id: "svc-y", slug: "wound-care", name_en: "Wound-care" }, { id: "svc-ar-only", name_ar: "خدمة" }]);
    // svc-x: its slug is taken, so the slug of its name; svc-y: both are taken, so its id
    expect(serviceTokens(services).map((x) => x.token)).toEqual(["iv-drip-at-home", "wound-care", "another-wound-service", "svc-y", "svc-ar-only"]);
    expect(slugOf("Medical Injections (IV/IM)")).toBe("medical-injections-iv-im");
    expect(slugOf("خدمة")).toBe("");
  });

  it("resolves a URL token to its service (token, id or slug) and to nothing for an unknown one", () => {
    const services = publicNursingServices(CATALOGUE);
    expect(serviceForToken(services, "IV-Drip-At-Home")?.service.id).toBe("svc-iv");
    expect(serviceForToken(services, "svc-wound")?.service.id).toBe("svc-wound");
    expect(serviceForToken(services, "svc-iv-old")).toBeNull();
    expect(serviceForToken(services, "nonsense")).toBeNull();
  });

  it("reads the price range from the offers that have a price, and nothing when none has", () => {
    expect(priceRange([{ price: 300, currency: "SAR" }, { price: 220, currency: "SAR" }, { currency: "SAR" }])).toEqual({ low: 220, high: 300, currency: "SAR", count: 2 });
    expect(priceRange([{ currency: "SAR" }])).toBeUndefined();
    expect(priceRange(undefined)).toBeUndefined();
  });

  it("reads the cities by their slug and drops a deleted one", () => {
    expect(citiesOf(CITIES).map((c) => c.slug)).toEqual(["riyadh", "jeddah"]);
  });
});

describe("the sitemap of home nursing by service and city", () => {
  const urlsOf = (xml: string) => [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g)].map((m) => ({ loc: m[1], rest: m[2] }));

  it("lists every approved service in every city, in all six languages with hreflang and x-default, and no duplicate", async () => {
    backend();
    const { GET } = await import("@/app/sitemaps/nursing.xml/route");
    const urls = urlsOf(await (await GET()).text());
    const locs = urls.map((u) => u.loc);
    expect(new Set(locs).size).toBe(locs.length);
    expect(urls).toHaveLength(2 * 2 * 6); // 2 services x 2 cities x 6 languages
    for (const l of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      for (const c of ["riyadh", "jeddah"]) for (const s of ["iv-drip-at-home", "wound-care"]) expect(locs).toContain(`https://nabd.plus/${l}/home-nursing/${c}/${s}`);
    }
    expect(locs.join("\n")).not.toMatch(/svc-iv-old|svc-iv-copy|pending|gone|undefined/);
    for (const u of urls) {
      for (const l of ["ar", "en", "ur", "hi", "bn", "fil"]) expect(u.rest).toContain(`hreflang="${l}"`);
      expect(u.rest).toContain('hreflang="x-default"');
    }
  });

  it("answers 503 with Retry-After and no URL when the backend is down", async () => {
    backend(true);
    const mod = await import("@/app/sitemaps/nursing.xml/route");
    const res: Response = await mod.GET();
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(await res.text()).not.toContain("<url>");
    expect(mod.dynamic).toBe("force-dynamic");
  });

  it("is in the sitemap index", async () => {
    backend();
    const { GET } = await import("@/app/sitemap.xml/route");
    expect(await (await GET()).text()).toContain("/sitemaps/nursing.xml");
  });
});

describe("the page of one service in one city", () => {
  it("has its own title, description, canonical and the six alternates (indexable)", async () => {
    backend();
    const meta = await generateMetadata(props("riyadh", "iv-drip-at-home", "ar"));
    expect(meta.title).toBe("meta.nursingService.title:IV Drip at Home,Riyadh".replace("IV Drip at Home", "محلول وريدي منزلي").replace("Riyadh", "الرياض"));
    expect(meta.description).toContain("meta.nursingService.description");
    expect(meta.alternates?.canonical).toBe("https://nabd.plus/ar/home-nursing/riyadh/iv-drip-at-home");
    expect(Object.keys(meta.alternates?.languages ?? {}).sort()).toEqual(["ar", "bn", "en", "fil", "hi", "ur", "x-default"]);
    expect(meta.alternates?.languages?.["x-default"]).toBe("https://nabd.plus/ar/home-nursing/riyadh/iv-drip-at-home");
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("is not indexed, and a 404, for a city or a service that is not in the catalogue", async () => {
    backend();
    for (const [city, service] of [["atlantis", "wound-care"], ["riyadh", "svc-iv-old"], ["riyadh", "nonsense"]]) {
      expect((await generateMetadata(props(city, service))).robots).toEqual({ index: false, follow: false });
      await expect(Page(props(city, service))).rejects.toThrow("NEXT_NOT_FOUND");
    }
  });

  it("with nurses offering it: the price range, the count, the booking link and the offer range in the structured data", async () => {
    backend();
    const html = renderToStaticMarkup(await Page(props("riyadh", "iv-drip-at-home")));
    expect(html).toContain("nursingService.priceRange:");
    expect(html).toContain("nursingService.providers:2");
    expect(html).toContain('href="/en/home-care/services/svc-iv/book"');
    expect(html).not.toContain("data-notify");
    const ld = ldOf(html);
    const service = ld.find((x) => x["@type"] === "Service");
    expect(service.areaServed).toEqual({ "@type": "City", name: "Riyadh" });
    expect(service.offers).toEqual({ "@type": "AggregateOffer", lowPrice: 220, highPrice: 300, priceCurrency: "SAR", offerCount: 2 });
    expect(ld.some((x) => x["@type"] === "MedicalProcedure")).toBe(true);
    expect(ld.find((x) => x["@type"] === "BreadcrumbList").itemListElement).toHaveLength(4);
    // the other services of the city are linked, not the page itself
    expect(html).toContain("/en/home-nursing/riyadh/wound-care");
    expect(html).not.toMatch(/href="\/en\/home-nursing\/riyadh\/iv-drip-at-home"/);
  });

  it("with no nurse offering it yet: the empty state and the notify-me button for that service, and no offer in the structured data", async () => {
    backend();
    const html = renderToStaticMarkup(await Page(props("jeddah", "wound-care")));
    expect(html).toContain("nursingService.emptyTitle:");
    expect(html).toContain('data-notify="nursing:svc-wound"');
    expect(html).not.toContain("/book");
    expect(ldOf(html).find((x) => x["@type"] === "Service").offers).toBeUndefined();
  });

  it("is static: no request reads, no inline style, no raw colour", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("app/[locale]/home-nursing/[citySlug]/[serviceSlug]/page.tsx", "utf8");
    expect(src).not.toMatch(/\bcookies\(|\bheaders\(|searchParams|no-store|style=|#[0-9a-fA-F]{3,8}\b/);
  });
});
