import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export const revalidate = 21600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const commonProcedures = [
    "mri-magnetic-resonance-imaging",
    "ct-computed-tomography-scan",
    "ultrasound-sonography",
    "x-ray-radiography",
    "mammogram-breast-imaging",
    "dexa-bone-density-scan",
  ];
  const cities = ["riyadh", "jeddah", "dammam", "makkah", "madinah", "khobar"];

  const urls = locales.flatMap((locale) =>
    commonProcedures.flatMap((proc) =>
      cities.map((city) => {
        const loc = localizedUrl(locale, `/radiology/${proc}/${city}`);
        return `  <url><loc>${esc(loc)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      }),
    ),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
