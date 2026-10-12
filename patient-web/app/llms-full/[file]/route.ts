import { NextResponse } from "next/server";
import { backendList, cell, LLMS_LOCALES, type LlmsLocale, siteOriginForLlms } from "@/lib/llms-full";

export const revalidate = 86400;

type Product = { slug?: string; sku?: string | number; name?: string; price?: number; currency?: string; form?: string; strength?: string; active_ingredient?: string; category?: string; is_rx?: boolean; url?: string };
type Props = { params: Promise<{ file: string }> };

/** /llms-full/{lang}.txt: every public product in one language, with its page in that language. */
export async function GET(_req: Request, { params }: Props) {
  const { file } = await params;
  const locale = file.replace(/\.txt$/, "") as LlmsLocale;
  if (!file.endsWith(".txt") || !LLMS_LOCALES.includes(locale)) return new NextResponse("not_found", { status: 404 });
  const origin = siteOriginForLlms();
  try {
    const all: Product[] = [];
    for (let page = 1; page <= 30; page++) {
      const items = await backendList<Product>(`/public/products/search?limit=1000&page=${page}&locale=${locale}`, 86400);
      all.push(...items);
      if (items.length < 1000) break;
    }
    const lines = all.filter((p) => p.slug).map((p) => [
      cell(p.name), p.price ?? "", cell(p.currency || "SAR"), cell(p.form), cell(p.strength), cell(p.active_ingredient), cell(p.category), p.is_rx ? "Rx" : "OTC",
      p.url && p.url.startsWith(`${origin}/${locale}/p/`) ? p.url : `${origin}/${locale}/p/${encodeURIComponent(String(p.slug))}`,
    ].join(" | "));
    const header = `# Nabd Plus products (${locale}): ${lines.length}\n# name | price | currency | form | strength | active ingredient | category | Rx/OTC | page\n# Rx items need a prescription on Nabd Plus. Prices change: the page shows the current one.\n`;
    return new NextResponse(header + lines.join("\n") + "\n", { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400", "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse(`# products (${locale}) temporarily unavailable\n`, { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "300" } });
  }
}
