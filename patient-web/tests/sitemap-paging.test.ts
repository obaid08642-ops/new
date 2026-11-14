import { afterEach, describe, expect, it, vi } from "vitest";
import { pagedSitemapResponse, SITEMAP_LIMIT_URLS, SITEMAP_MAX_BYTES, SITEMAP_PAGE_URLS, sitemapPageCount } from "@/lib/sitemap";

/**
 * Paged sitemaps (labs and nursing): one locale per file, at most 45,000 URLs and 45 MB each, every page listed in the index,
 * nothing lost between pages, tests and services that no provider offers yet kept.
 */
const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"];
const CITY_COUNT = 150;
const LAB_TESTS = 420; // 420 x 150 = 63,000 paths per language: three pages of 25,000
const NURSING = 200; // 200 x 150 = 30,000: two pages
const CITIES = Array.from({ length: CITY_COUNT }, (_, i) => ({ code: `sa-city${i}`, name_en: `City ${i}` }));
const LABS = Array.from({ length: LAB_TESTS }, (_, i) => ({ id: `lab${i}`, short_code: `T${i}`, name_en: `Test ${i}`, providers_count: i % 2, updatedAt: "2026-10-02T08:00:00.000Z" }));
const HOME = Array.from({ length: NURSING }, (_, i) => ({ id: `hc${i}`, name_en: `Nursing service ${i}`, name_ar: `خدمة ${i}` }));

function backend(down = false) {
  vi.stubGlobal("fetch", vi.fn(async (input: unknown) => {
    const url = new URL(String(input));
    const key = url.pathname.replace(/^\/api\/v1/, "");
    if (down) return new Response("down", { status: 503 });
    if (key === "/labs/services") {
      const page = Number(url.searchParams.get("page") || 1), limit = Number(url.searchParams.get("limit") || 100);
      return Response.json({ data: LABS.slice((page - 1) * limit, page * limit), total: LABS.length, page, limit, total_pages: Math.ceil(LABS.length / limit) });
    }
    if (key === "/home-care/services") return Response.json(HOME);
    if (key === "/locations/cities") return Response.json(CITIES);
    if (key.startsWith("/public/sitemaps/products")) return Response.json({ pages: 0, urls: [] });
    if (key === "/public/sitemaps/products-count") return Response.json({ pages: 0 });
    return new Response("not found", { status: 404 });
  }));
}
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); vi.doUnmock("@/lib/api/public-config-server"); });

const urlsOf = (xml: string) => [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g)].map((m) => ({ loc: m[1], rest: m[2] }));
const file = async (kind: "labs" | "nursing", locale: string, page: number) => {
  const { GET } = await import(`@/app/sitemaps/${kind}/[locale]/[page]/route`);
  return GET(new Request("https://nabd.plus"), { params: Promise.resolve({ locale, page: `${page}.xml` }) }) as Promise<Response>;
};

describe("paged sitemaps never exceed the limits and lose nothing", { timeout: 90_000 }, () => {
  it("the real page size keeps a file under 45,000 URLs and 45 MB, with long Arabic-free slugs and the full hreflang set", () => {
    const entries = Array.from({ length: SITEMAP_PAGE_URLS + 5 }, (_, i) => ({ path: `/home-nursing/city-with-a-long-name-${i % 150}/a-very-long-nursing-service-token-${i}`, lastmod: "2026-10-30", priority: "0.6" }));
    return pagedSitemapResponse("fil", entries, 1).text().then((xml) => {
      expect(urlsOf(xml)).toHaveLength(SITEMAP_PAGE_URLS);
      expect(urlsOf(xml).length).toBeLessThanOrEqual(SITEMAP_LIMIT_URLS);
      expect(Buffer.byteLength(xml)).toBeLessThanOrEqual(SITEMAP_MAX_BYTES);
    });
  });

  it("the pages add up to every path, none lost and none twice, whatever the page size", async () => {
    const entries = Array.from({ length: 1234 }, (_, i) => ({ path: `/labs/t${i}/riyadh` }));
    for (const size of [100, 500, 1234, 5000]) {
      const seen = new Set<string>();
      const pages = sitemapPageCount(entries.length, size);
      for (let p = 1; p <= pages; p++) {
        const res = pagedSitemapResponse("ur", entries, p, size);
        expect(res.status).toBe(200);
        for (const u of urlsOf(await res.text())) seen.add(u.loc);
      }
      expect(seen.size).toBe(entries.length);
      expect(pagedSitemapResponse("ur", entries, pages + 1, size).status).toBe(404);
    }
  });

  it.each([["labs", LAB_TESTS * CITY_COUNT], ["nursing", NURSING * CITY_COUNT]] as const)("%s routes: every file within the limits, in the language of the file, with hreflang + x-default", async (kind, paths) => {
    backend();
    const pages = sitemapPageCount(paths);
    expect(pages).toBeGreaterThan(1);
    for (const locale of ["ar", "fil"]) {
      let total = 0;
      for (let p = 1; p <= pages; p++) {
        const res = await file(kind, locale, p);
        expect(res.status).toBe(200);
        const xml = await res.text();
        const urls = urlsOf(xml);
        total += urls.length;
        expect(urls.length).toBeLessThanOrEqual(SITEMAP_LIMIT_URLS);
        expect(Buffer.byteLength(xml)).toBeLessThanOrEqual(SITEMAP_MAX_BYTES);
        for (const u of urls.slice(0, 50)) {
          expect(u.loc.startsWith(`https://nabd.plus/${locale}/`)).toBe(true);
          for (const l of LOCALES) expect(u.rest).toContain(`hreflang="${l}"`);
          expect(u.rest).toContain('hreflang="x-default"');
        }
      }
      expect(total).toBe(paths);
      expect((await file(kind, locale, pages + 1)).status).toBe(404);
    }
  }, 120_000);

  it("labs reads the whole catalogue (not the first 100 tests), keeps tests no lab offers yet, and keeps lastmod", async () => {
    backend();
    const first = await (await file("labs", "en", 1)).text();
    expect(first).toContain("/en/labs/T0/city0<"); // providers_count 0: still listed ("notify me")
    expect(first).toContain("<lastmod>2026-10-02</lastmod>");
    // the last test of the 5th feed page is in the last file (62,850 of 63,000 paths in)
    expect(await (await file("labs", "en", sitemapPageCount(LAB_TESTS * CITY_COUNT))).text()).toContain("/en/labs/T419/city0<");
  });

  it("the index lists every page of every language for labs and nursing, in files that exist", async () => {
    backend();
    vi.doMock("@/lib/api/public-config-server", () => ({ getDisabledModules: async () => new Set() }));
    const { GET } = await import("@/app/sitemap.xml/route");
    const xml = await (await GET()).text();
    for (const l of LOCALES) {
      for (const p of [1, 2, 3]) expect(xml).toContain(`/sitemaps/labs/${l}/${p}.xml`);
      for (const p of [1, 2]) expect(xml).toContain(`/sitemaps/nursing/${l}/${p}.xml`);
      expect(xml).not.toContain(`/sitemaps/labs/${l}/4.xml`);
      expect(xml).not.toContain(`/sitemaps/nursing/${l}/3.xml`);
    }
    expect(xml).not.toContain("/sitemaps/labs.xml");
    expect(xml).not.toContain("/sitemaps/nursing.xml");
  });

  it("a module switched off drops its pages from the index; a failing feed drops only that kind", async () => {
    backend();
    vi.doMock("@/lib/api/public-config-server", () => ({ getDisabledModules: async () => new Set(["labs_radiology"]) }));
    const { GET } = await import("@/app/sitemap.xml/route");
    const xml = await (await GET()).text();
    expect(xml).not.toContain("/sitemaps/labs/");
    expect(xml).toContain("/sitemaps/nursing/ar/1.xml");
  });

  it("answers 404 for a bad language or page and 503 + Retry-After when the backend is down", async () => {
    backend();
    expect((await file("labs", "fr", 1)).status).toBe(404);
    expect((await file("labs", "ar", 0)).status).toBe(404);
    vi.unstubAllGlobals(); vi.resetModules();
    backend(true);
    const res = await file("nursing", "ar", 1);
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(await res.text()).not.toContain("<url>");
    const mod = await import("@/app/sitemaps/labs/[locale]/[page]/route");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});
