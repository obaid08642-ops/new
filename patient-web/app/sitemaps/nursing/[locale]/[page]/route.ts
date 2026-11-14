import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n";
import { pagedSitemapResponse, sitemapRoute } from "@/lib/sitemap";
import { nursingSitemapEntries } from "@/lib/sitemap-catalogue";

// Dynamic: the feeds are cached in the Next data cache instead (a build without the backend must not fail).
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; page: string }> };

/** Paged sitemap /sitemaps/nursing/{locale}/{n}.xml: one locale per file, at most 25,000 URLs each (see pagedSitemapResponse). */
export async function GET(_req: Request, { params }: Props) {
  const { locale, page } = await params;
  const pageNum = Number((page || "").replace(/\.xml$/, ""));
  if (!isLocale(locale) || !Number.isInteger(pageNum) || pageNum < 1) return new NextResponse("not_found", { status: 404 });
  return sitemapRoute(async () => pagedSitemapResponse(locale, await nursingSitemapEntries(), pageNum));
}
