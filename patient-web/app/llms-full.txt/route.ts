import { NextResponse } from "next/server";
import { backendList, LLMS_LOCALES, siteOriginForLlms, sixLocaleLinks } from "@/lib/llms-full";

export const revalidate = 21600;

type Slugged = { slug?: string };
type Named = { id?: string; slug?: string; short_code?: string; name_ar?: string; name_en?: string; name?: string };

const name = (x: Named) => x.name_en || x.name || x.name_ar || x.short_code || x.slug || x.id || "";

/**
 * llms-full.txt: every public entity with its page in the six site languages, from the same
 * backend feeds as the sitemaps (only public, reviewed entities). Products are listed per
 * language in /llms-full/{lang}.txt because their slug is translated per language.
 */
export async function GET() {
  const origin = siteOriginForLlms();
  try {
    const [doctors, facilities, pharmacies, conditions, articles, labs, radiology, nursing] = await Promise.all([
      backendList<Slugged>("/public/sitemaps/doctors/ar"),
      backendList<Slugged>("/public/sitemaps/facilities/ar"),
      backendList<Slugged>("/public/sitemaps/pharmacies/ar"),
      backendList<Slugged>("/public/sitemaps/conditions/ar"),
      backendList<Slugged>("/public/sitemaps/articles/ar", 3600),
      backendList<Named>("/labs/services?limit=100"),
      backendList<Named>("/radiology/services?limit=100"),
      backendList<Named>("/home-care/services"),
    ]);
    const section = (title: string, lines: string[]) => (lines.length ? [`## ${title}`, "", ...lines, ""] : []);
    const bySlug = (rows: Slugged[], prefix: string) => rows.filter((r) => r.slug).map((r) => sixLocaleLinks(String(r.slug), `${prefix}/${encodeURIComponent(String(r.slug))}`));
    const body = [
      "# Nabd Plus: full list of public pages",
      "",
      "> Every public page in Arabic (ar), English (en), Urdu (ur), Hindi (hi), Bengali (bn) and Filipino (fil). Only reviewed, published entities are listed. Prices and availability are on each page and can change.",
      "",
      "## Products (one file per language: the product slug is translated)",
      "",
      ...LLMS_LOCALES.map((l) => `- [Products in ${l}](${origin}/llms-full/${l}.txt)`),
      "",
      ...section("Doctors", bySlug(doctors, "/doctor")),
      ...section("Hospitals and clinics", bySlug(facilities, "/facility")),
      ...section("Pharmacies", bySlug(pharmacies, "/pharmacy")),
      ...section("Medical conditions", bySlug(conditions, "/condition")),
      ...section("Health articles", bySlug(articles, "/articles")),
      ...section("Radiology services", radiology.filter((r) => r.id).map((r) => sixLocaleLinks(name(r), `/diagnostics/radiology/${encodeURIComponent(String(r.id))}`))),
      ...section("Home nursing services", nursing.filter((r) => r.id).map((r) => sixLocaleLinks(name(r), `/home-care/services/${encodeURIComponent(String(r.id))}`))),
      ...section("Lab tests (each test has a page per city: /{lang}/labs/{test}/{city})", labs.map((r) => r.slug || r.short_code || r.id).filter(Boolean).map((t) => `- ${t}`)),
    ].join("\n");
    return new NextResponse(body, { headers: { "Cache-Control": "public, max-age=21600, stale-while-revalidate=86400", "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
  } catch {
    // The route errors so the last good copy keeps being served; a first-ever miss says so.
    return new NextResponse("# llms-full.txt temporarily unavailable\n", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "300" } });
  }
}
