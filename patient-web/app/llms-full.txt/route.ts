import { NextResponse } from "next/server";

/**
 * Verified against live API: 38 real fields — id, sku, slug, name, official_name, description, indications, dosage_instructions, side_effects, warnings, storage_conditions, how_to_use[], category, sub_category, sub_sub_category, form, strength, package_size, active_ingredient, manufacturer, barcode, price, old_price, discount_percent, currency, is_rx, available, images, etc. — total 20990
 * Each line: slug | name | price | category | form | strength | package_size | active_ingredient | is_rx | indications | dosage_instructions | warnings | url
 */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
  try {
    // Paginate through all 20990 (API limit 1000/page = 21 pages)
    const all: any[] = [];
    for (let page = 1; page <= 21; page++) {
      const res = await fetch(`${base}/api/v1/public/products/search?limit=1000&page=${page}&locale=ar`, { next: { revalidate: 86400 } });
      const data: any = await res.json().catch(() => null);
      const items: any[] = Array.isArray(data) ? data : data?.data || data?.products || data?.items || [];
      if (!items.length) break;
      all.push(...items);
      if (!data?.has_more) break;
    }
    const products = all;
    const lines = products.slice(0, 21000).map((p: any) => {
      const how = Array.isArray(p.how_to_use) ? p.how_to_use.join('; ') : (p.how_to_use || '');
      const warn = Array.isArray(p.warnings) ? p.warnings.join('; ') : (p.warnings || '');
      const ind = Array.isArray(p.indications) ? p.indications.join('; ') : (p.indications || '');
      const dosage = p.dosage_instructions || '';
      return [
        p.slug || p.sku || "",
        (p.name || "").replace(/\|/g, " "),
        p.price ?? "",
        (p.category || "").replace(/\|/g, " "),
        (p.form || "").replace(/\|/g, " "),
        (p.strength || "").replace(/\|/g, " "),
        (p.package_size || "").replace(/\|/g, " "),
        (p.active_ingredient || "").replace(/\|/g, " "),
        p.is_rx ? "Rx" : "OTC",
        ind.slice(0, 80).replace(/\|/g, " "),
        dosage.slice(0, 80).replace(/\|/g, " "),
        warn.slice(0, 80).replace(/\|/g, " "),
        how.slice(0, 80).replace(/\|/g, " "),
        p.url || `https://www.nabd.plus/ar/p/${p.slug || p.sku}`,
      ].join(" | ");
    });
    const header = `# Nabd Plus — Full Catalog 20990 x38 fields — ${new Date().toISOString().slice(0,10)}\n# slug | name | price | category | form | strength | package_size | active_ingredient | is_rx | indications | dosage | warnings | how_to_use | url\n`;
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
