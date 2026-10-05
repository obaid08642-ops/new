import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Q33: /[locale]/services/[serviceSlug]/[citySlug] renders the NAMED service in
// that city (city name in the page locale), answers a real HTTP 404 for an
// unknown service/city, and the sitemap emits only pairs that resolve.
const nav = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("next/navigation", () => ({ notFound: nav.notFound, redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn(), getTranslations: async () => (k: string) => k }));
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response("page", { status: 200 }) }));
vi.mock("../i18n/routing", () => ({ routing: { locales: ["ar", "en", "ur", "hi", "bn", "fil"] } }));

import { proxy } from "../proxy";
import ServiceCityPage from "../app/[locale]/services/[serviceSlug]/[citySlug]/page";
import { GET as servicesSitemap } from "../app/sitemaps/services.xml/route";

const CITIES = [
  { code: "sa-riyadh", name_ar: "الرياض", name_en: "Riyadh" },
  { code: "sa-jeddah", name_ar: "جدة", name_en: "Jeddah" },
];
const RIYADH_FEED = {
  items: [
    { id: "8f15f372-0000-4000-8000-000000000001", slug: "dr-sara-cardiology", name: "د. سارة القحطاني", specialty: "cardiology", city: "الرياض", url: "https://nabd.plus/ar/doctor/dr-sara-cardiology" },
    { id: "72a9eeab-0000-4000-8000-000000000002", name: "منشأة بلا رابط", city: "الرياض" },
  ],
};

function backend() {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
    const url = decodeURIComponent(String(input));
    if (url.includes("/locations/cities")) return new Response(JSON.stringify(CITIES), { status: 200 });
    if (url.includes("/public/ai-catalog/services")) {
      return new Response(JSON.stringify(url.includes("city=الرياض") ? RIYADH_FEED : { items: [] }), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  }));
}

afterEach(() => { vi.unstubAllGlobals(); nav.notFound.mockClear(); });

const req = (path: string) => new NextRequest(new URL(path, "https://nabd.plus"));
const params = (locale: string, serviceSlug: string, citySlug: string) => ({ params: Promise.resolve({ locale, serviceSlug, citySlug }) });

describe("Q33 service x city page", () => {
  it("renders the named service with the Arabic city name, no slug or raw id in the H1", async () => {
    backend();
    const html = renderToStaticMarkup(await ServiceCityPage(params("ar", "dr-sara-cardiology", "riyadh")));
    const h1 = /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1] ?? "";
    expect(h1).toBe("د. سارة القحطاني في الرياض");
    expect(html).not.toContain("8f15f372");
    expect(h1).not.toContain("riyadh");
    expect(h1).not.toContain("dr-sara-cardiology");
  });

  it("uses the English city name on an English page", async () => {
    backend();
    const html = renderToStaticMarkup(await ServiceCityPage(params("en", "dr-sara-cardiology", "riyadh")));
    expect(/<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1]).toBe("د. سارة القحطاني in Riyadh");
  });

  it("calls notFound for a service not offered in that city, an unknown service, or an unknown city", async () => {
    backend();
    for (const [s, c] of [["dr-sara-cardiology", "jeddah"], ["no-such-service", "riyadh"], ["dr-sara-cardiology", "atlantis"], ["72a9eeab-0000-4000-8000-000000000002", "riyadh"]]) {
      await expect(ServiceCityPage(params("ar", s, c))).rejects.toThrow("NEXT_NOT_FOUND");
    }
  });
});

describe("Q33 real HTTP status", () => {
  it("answers 404 (not a 200 page) for an unknown service or city", async () => {
    backend();
    for (const path of ["/ar/services/no-such-service/riyadh", "/en/services/dr-sara-cardiology/jeddah", "/ar/services/dr-sara-cardiology/atlantis"]) {
      const res = await proxy(req(path));
      expect(res.status).toBe(404);
      expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    }
  });

  it("lets a real pair through to the page", async () => {
    backend();
    expect((await proxy(req("/ar/services/dr-sara-cardiology/riyadh"))).status).toBe(200);
  });

  it("does not turn a backend outage into a 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    expect((await proxy(req("/ar/services/dr-sara-cardiology/riyadh"))).status).toBe(200);
  });
});

describe("Q33 sitemap emits only real pairs", () => {
  it("every emitted URL resolves to the named service; nothing for cities without that service", async () => {
    backend();
    const xml = await (await servicesSitemap()).text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    expect(locs.length).toBeGreaterThan(0);
    expect(locs.every((p) => p.endsWith("/services/dr-sara-cardiology/riyadh"))).toBe(true);
    for (const p of locs) expect((await proxy(req(p))).status).toBe(200);
  });
});
