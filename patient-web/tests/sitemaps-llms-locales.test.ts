import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Owner 2026-10-12 (SEO/GEO/AEO): every public type is in a sitemap and in llms-full.txt, in all
 * six languages, each sitemap URL with its six hreflang alternates and x-default; nothing is
 * invented when the backend is down.
 */
const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"];

const FEEDS: Record<string, unknown> = {
  "/public/sitemaps/doctors/ar": { urls: [{ slug: "dr-sara-1", lastmod: "2026-10-01" }] },
  "/public/sitemaps/facilities/ar": { urls: [{ slug: "kfsh" }] },
  "/public/sitemaps/pharmacies/ar": { urls: [{ slug: "al-dawaa-1" }] },
  "/public/sitemaps/conditions/ar": { urls: [{ slug: "headache" }] },
  "/public/sitemaps/articles/ar": { urls: [{ slug: "vitamin-d-a1" }] },
  "/public/sitemaps/doctor-cities/ar": { urls: [{ specialty: "cardiology", city: "Riyadh" }] },
  "/locations/cities": [{ code: "sa-riyadh" }, { code: "sa-jeddah" }],
  "/labs/services?limit=100": { items: [{ id: "l1", short_code: "CBC", name_en: "Complete blood count" }] },
  "/radiology/services?limit=100": { items: [{ id: "r1", short_code: "MRI Brain", name_en: "MRI brain" }] },
  "/public/ai-catalog/services": { items: [{ id: "svc-1" }] },
  "/home-care/services": [{ id: "h1", name_en: "Wound care" }],
};

function stubBackend(up = true) {
  vi.stubGlobal("fetch", vi.fn(async (input: unknown) => {
    const url = new URL(String(input));
    const key = url.pathname.replace(/^\/api\/v1/, "") + url.search;
    if (!up) return new Response("down", { status: 503 });
    if (key.startsWith("/public/products/search")) {
      const locale = url.searchParams.get("locale");
      return Response.json({ items: [{ slug: `panadol-${locale}`, name: `Panadol ${locale}`, price: 12, is_rx: false }] });
    }
    return key in FEEDS ? Response.json(FEEDS[key]) : new Response("not found", { status: 404 });
  }));
}

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

const urlsOf = (xml: string) => [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g)].map((m) => ({ loc: m[1], rest: m[2] }));

const SITEMAPS: Array<[string, RegExp]> = [
  ["doctors.xml", /\/doctor\/dr-sara-1$/],
  ["facilities.xml", /\/facility\/kfsh$/],
  ["pharmacies.xml", /\/pharmacy\/al-dawaa-1$/],
  ["conditions.xml", /\/condition\/headache$/],
  ["articles.xml", /\/articles\/vitamin-d-a1$/],
  ["locations.xml", /\/doctors\/cardiology\/Riyadh$/],
  ["labs.xml", /\/labs\/CBC\/riyadh$/],
  ["radiology.xml", /\/diagnostics\/radiology\/r1$/],
  ["services.xml", /\/home-nursing\/riyadh$/],
  ["nursing.xml", /\/home-nursing\/riyadh\/wound-care$/],
];

describe("entity sitemaps: six locales, hreflang + x-default on every URL", () => {
  it.each(SITEMAPS)("%s", async (file, sample) => {
    stubBackend();
    const { GET } = await import(`@/app/sitemaps/${file}/route`);
    const xml = await (await GET()).text();
    const urls = urlsOf(xml);
    expect(urls.length).toBeGreaterThan(0);
    for (const l of LOCALES) expect(urls.some((u) => u.loc.startsWith(`https://nabd.plus/${l}/`) && sample.test(u.loc))).toBe(true);
    for (const u of urls) {
      for (const l of LOCALES) expect(u.rest).toContain(`hreflang="${l}"`);
      expect(u.rest).toContain('hreflang="x-default"');
    }
    expect(xml).not.toMatch(/undefined|\/s\//);
  });

  it.each(SITEMAPS.map(([f]) => [f]))("%s answers 503 + Retry-After when the backend is down (never an invented or empty list)", async (file) => {
    stubBackend(false);
    const mod = await import(`@/app/sitemaps/${file}/route`);
    const res: Response = await mod.GET();
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(await res.text()).not.toContain("<url>");
    // dynamic: a build without the backend neither fails nor freezes an empty file
    expect(mod.dynamic).toBe("force-dynamic");
  });

  it("the doctors sitemap no longer lists the any-city duplicates of each doctor", async () => {
    stubBackend();
    const { GET } = await import("@/app/sitemaps/doctors.xml/route");
    const xml = await (await GET()).text();
    expect(urlsOf(xml).length).toBe(6);
  });

  it("the sitemap index lists the article sitemap", async () => {
    stubBackend();
    vi.doMock("@/lib/api/public-config-server", () => ({ getDisabledModules: async () => new Set() }));
    const { GET } = await import("@/app/sitemap.xml/route");
    const xml = await (await GET()).text();
    expect(xml).toContain("/sitemaps/articles.xml");
  });
});

describe("llms-full: every type in six languages", () => {
  it("lists each entity with its page in ar, en, ur, hi, bn and fil", async () => {
    stubBackend();
    const { GET } = await import("@/app/llms-full.txt/route");
    const text = await (await GET()).text();
    for (const path of ["/doctor/dr-sara-1", "/facility/kfsh", "/pharmacy/al-dawaa-1", "/condition/headache", "/articles/vitamin-d-a1", "/diagnostics/radiology/r1", "/home-care/services/h1"]) {
      for (const l of LOCALES) expect(text).toContain(`https://nabd.plus/${l}${path}`);
    }
    expect(text).toContain("CBC");
    for (const l of LOCALES) expect(text).toContain(`https://nabd.plus/llms-full/${l}.txt`);
    expect(text).not.toContain("www.nabd.plus");
  });

  it.each(LOCALES)("products in %s link to the page in that language", async (l) => {
    stubBackend();
    const { GET } = await import("@/app/llms-full/[file]/route");
    const res = await GET(new Request(`https://nabd.plus/llms-full/${l}.txt`), { params: Promise.resolve({ file: `${l}.txt` }) });
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain(`Panadol ${l}`);
    expect(text).toContain(`https://nabd.plus/${l}/p/panadol-${l}`);
  });

  it("an unknown language file is 404, a backend outage is 503 (never an invented list)", async () => {
    stubBackend(false);
    const { GET } = await import("@/app/llms-full/[file]/route");
    expect((await GET(new Request("https://nabd.plus/llms-full/fr.txt"), { params: Promise.resolve({ file: "fr.txt" }) })).status).toBe(404);
    expect((await GET(new Request("https://nabd.plus/llms-full/ar.txt"), { params: Promise.resolve({ file: "ar.txt" }) })).status).toBe(503);
    const full = await import("@/app/llms-full.txt/route");
    expect((await full.GET()).status).toBe(503);
  });
});

describe("llms.txt names every public type and all six languages", () => {
  it("has the six homes and a pattern for every type", async () => {
    const { GET } = await import("@/app/llms.txt/route");
    const text = await GET().text();
    for (const l of LOCALES) expect(text).toContain(`](/${l})`);
    for (const p of ["/{lang}/p/{slug}", "/{lang}/doctor/{slug}", "/{lang}/facility/{slug}", "/{lang}/pharmacy/{slug}", "/{lang}/labs/{test}/{city}", "/{lang}/diagnostics/radiology/{id}", "/{lang}/home-nursing/{city}", "/{lang}/home-nursing/{city}/{service}", "/{lang}/articles/{slug}", "/{lang}/condition/{code}"]) {
      expect(text).toContain(p);
    }
    expect(text).toContain("Moyasar");
    expect(text).not.toMatch(/tabby|tamara|x402|usdc|wallet/i);
  });
});
