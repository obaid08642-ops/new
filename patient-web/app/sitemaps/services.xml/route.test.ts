import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Q33: the services sitemap must emit service slugs, never raw ids, and only
// for rows the city's catalog feed really lists.
const CITIES = [{ code: "sa-riyadh", name_ar: "الرياض", name_en: "Riyadh" }];
const FEED = {
  items: [
    { id: "8f15f372-0000-4000-8000-000000000001", slug: "dr-sara-cardiology", name: "د. سارة", url: "https://nabd.plus/ar/doctor/dr-sara-cardiology" },
    { id: "72a9eeab-0000-4000-8000-000000000002", url: "https://nabd.plus/ar/facility/72a9eeab-0000-4000-8000-000000000002" },
    { id: "fac-3", slug: "kfsh-riyadh", name: "مستشفى" },
    { id: "dup", slug: "kfsh-riyadh", name: "مستشفى" },
    { id: "nameless", slug: "no-name-row" },
  ],
};

function mockBackend() {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
    const url = String(input);
    if (url.includes("/locations/cities")) return new Response(JSON.stringify(CITIES), { status: 200 });
    if (url.includes("/public/ai-catalog/services")) return new Response(JSON.stringify(FEED), { status: 200 });
    return new Response("not found", { status: 404 });
  }));
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("services sitemap (Q33)", () => {
  it("emits each listed service by slug, once per locale, and never a raw id", async () => {
    mockBackend();
    const xml = await (await GET()).text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.some((u) => u.includes("/services/dr-sara-cardiology/riyadh"))).toBe(true);
    expect(locs.some((u) => u.includes("/services/kfsh-riyadh/riyadh"))).toBe(true);
    expect(xml).not.toContain("8f15f372-0000-4000-8000-000000000001");
    expect(xml).not.toContain("72a9eeab");
    expect(xml).not.toContain("/services/fac-3/");
    expect(xml).not.toContain("no-name-row");
    const perLocale = locs.filter((u) => u.includes("/services/kfsh-riyadh/riyadh"));
    expect(new Set(perLocale).size).toBe(perLocale.length);
  });

  it("emits nothing for a city whose feed cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => String(input).includes("/locations/cities")
      ? new Response(JSON.stringify(CITIES), { status: 200 })
      : new Response("err", { status: 500 })));
    const xml = await (await GET()).text();
    expect(xml).not.toContain("<url>");
  });
});
