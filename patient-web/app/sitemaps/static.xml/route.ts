import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export const revalidate = 86400;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Static, indexable site entry points (per locale). */
export function GET() {
  const rows: Array<{ path: string; changefreq: string; priority: string }> = [
    { path: "", changefreq: "weekly", priority: "1.0" },
    { path: "/articles", changefreq: "daily", priority: "0.8" },
    { path: "/c", changefreq: "daily", priority: "0.9" },
  ];
  const urls = locales.flatMap((locale) =>
    rows.map(
      (r) => `  <url><loc>${esc(localizedUrl(locale, r.path))}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
    ),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
