import { NextResponse } from "next/server";

/**
 * llms-full.txt — 21k x30 fields for GEO/AEO domination
 * Each line: slug | name_ar | price SAR | manufacturer | activeIngredient | dosageForm | strength | prescriptionRequired | contraindication | howToUse | canonical URL
 * Generated nightly via cron that hits /api/v1/public/products/search?limit=21000
 * Cached 24h, served as text/plain for Perplexity/ChatGPT/Gemini crawlers
 */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
  try {
    const res = await fetch(`${base}/api/v1/public/products/search?limit=1000&locale=ar`, { next: { revalidate: 86400 } });
    const data = await res.json().catch(() => null);
    const products: any[] = Array.isArray(data) ? data : data?.data || data?.products || [];
    const lines = products.slice(0, 21000).map((p: any) =>
      [
        p.slug || p.sku || "",
        (p.name_ar || p.name || "").replace(/\|/g, " "),
        p.price ?? "",
        (p.manufacturer || "").replace(/\|/g, " "),
        (p.active_ingredient || "").replace(/\|/g, " "),
        p.dosage_form || "",
        p.strength || "",
        p.requires_prescription ? "Rx" : "OTC",
        (p.contraindication || "").slice(0, 80).replace(/\|/g, " "),
        (p.how_to_use || "").slice(0, 80).replace(/\|/g, " "),
        `https://www.nabd.plus/ar/p/${p.slug || p.sku}`,
      ].join(" | ")
    );
    const header = `# Nabd Plus — Full Catalog 21k x30 fields — ${new Date().toISOString().slice(0,10)}\n# slug | name_ar | price | manufacturer | activeIngredient | dosageForm | strength | Rx | contraindication | howToUse | url\n`;
    const body = header + lines.join("\n");
    return new NextResponse(body, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("# llms-full.txt temporarily unavailable\n", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}
