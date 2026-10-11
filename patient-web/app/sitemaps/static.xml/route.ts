import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { SITEMAP_NS, hreflangLinks, localizedUrl } from "@/lib/seo";
import { getDisabledModules } from "@/lib/api/public-config-server";
import { visibleItems } from "@/lib/modules";

// 5 minutes (was a day): a module switched off in the admin leaves the sitemap within minutes (#953)
export const revalidate = 300;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Static, indexable site entry points (per locale). */
export async function GET() {
  const all: Array<{ path: string; changefreq: string; priority: string }> = [
    { path: "", changefreq: "weekly", priority: "1.0" },
    { path: "/articles", changefreq: "daily", priority: "0.8" },
    { path: "/c", changefreq: "daily", priority: "0.9" },
    { path: "/consultations/doctors", changefreq: "daily", priority: "0.8" },
    { path: "/diagnostics/labs", changefreq: "daily", priority: "0.8" },
    { path: "/diagnostics/radiology", changefreq: "daily", priority: "0.8" },
    { path: "/nursing/catalog", changefreq: "daily", priority: "0.7" },
    { path: "/nutrition", changefreq: "weekly", priority: "0.7" },
    { path: "/maternity", changefreq: "weekly", priority: "0.6" },
    { path: "/mental-health", changefreq: "weekly", priority: "0.6" },
    { path: "/family", changefreq: "weekly", priority: "0.6" },
    { path: "/health", changefreq: "weekly", priority: "0.7" },
  ];
  const rows = visibleItems(all, (r) => r.path, await getDisabledModules());
  const urls = locales.flatMap((locale) =>
    rows.map(
      (r) => `  <url><loc>${esc(localizedUrl(locale, r.path))}</loc>${hreflangLinks(r.path)}<changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
    ),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${SITEMAP_NS}>\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
