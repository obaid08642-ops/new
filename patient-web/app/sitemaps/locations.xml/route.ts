import { listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

export const revalidate = 86400;

/** Doctors by specialty and city: /{locale}/doctors/{specialty}/{city}, only for pairs that have
 *  public doctors (an empty pair answers noindex), six locales + x-default. */
export async function GET() {
  const rows = listItems<{ specialty?: string; city?: string; lastmod?: string }>(await sitemapFeed("/public/sitemaps/doctor-cities/ar", 86400));
  return localizedSitemap(rows.filter((r) => r.specialty && r.city).map((r) => ({
    path: `/doctors/${encodeURIComponent(String(r.specialty))}/${encodeURIComponent(String(r.city))}`, lastmod: r.lastmod,
  })));
}
