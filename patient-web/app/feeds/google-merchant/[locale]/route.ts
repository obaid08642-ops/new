import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n";
import { sitemapFeed, sitemapRoute } from "@/lib/sitemap";
import { merchantFeedXml, type MerchantFeedItem } from "@/lib/merchant-feed";

export const revalidate = 21600;

type Page = { page: number; pages: number; items: MerchantFeedItem[] };
const MAX_PAGES = 60;

/**
 * Google / Microsoft Merchant Center product feed, one file per language: https://nabd.plus/feeds/google-merchant/{locale}.xml
 * (give Merchant Center the URL; it fetches daily). Over-the-counter products only, built from the same public catalogue as the
 * product pages and sitemaps; if the backend fails the route answers 503 and Merchant keeps its last copy.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw.replace(/\.xml$/, "");
  if (!isLocale(locale)) return new NextResponse("not_found", { status: 404 });
  return sitemapRoute(async () => {
    const first = await sitemapFeed<Page>(`/public/feeds/merchant/${locale}/1`);
    const rest = await Promise.all(
      Array.from({ length: Math.max(Math.min(first.pages, MAX_PAGES) - 1, 0) }, (_, i) => sitemapFeed<Page>(`/public/feeds/merchant/${locale}/${i + 2}`)),
    );
    const items = [first, ...rest].flatMap((p) => p.items);
    return new NextResponse(merchantFeedXml(locale, items), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  });
}
