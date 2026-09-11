import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export const revalidate = 21600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
  let tests: string[] = [];
  try {
    const res = await fetch(`${backendUrl}/api/v1/labs/services?limit=100`, { next: { revalidate: 21600 } });
    if (res.ok) {
      const data: any = await res.json();
      const items: any[] = Array.isArray(data) ? data : data?.data || data?.items || [];
      tests = items.map((x: any) => x.slug || x.short_code || x.id).filter(Boolean).slice(0, 100);
    }
  } catch {}
  if (!tests.length) {
    tests = [
      "complete-blood-count-cbc",
      "lipid-profile",
      "fasting-blood-glucose",
      "liver-function-test-lft",
      "kidney-function-test-kft",
      "vitamin-d-test",
      "thyroid-profile-tsh",
      "hba1c-glycated-hemoglobin",
    ];
  }
  const cities = ["riyadh", "jeddah", "dammam", "makkah", "madinah", "khobar", "tabuk", "abha", "qassim", "hail", "jubail", "yanbu"];

  const urls = locales.flatMap((locale) =>
    tests.flatMap((test) =>
      cities.map((city) => {
        const loc = localizedUrl(locale, `/labs/${encodeURIComponent(test)}/${city}`);
        return `  <url><loc>${esc(loc)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      }),
    ),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
