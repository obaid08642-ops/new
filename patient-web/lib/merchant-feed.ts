import { escXml, localizedUrl } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";
import { cdnImage } from "@/lib/api/public-products-server";

/** One row of GET /public/feeds/merchant/:locale/:page (over-the-counter products only; the backend never sends a prescription item). */
export type MerchantFeedItem = {
  id: string; slug: string; title: string; description: string | null; price: number; currency: string;
  available: boolean; image: string | null; brand: string | null; gtin: string | null; category: string | null;
};

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const tag = (name: string, value: string | null | undefined) => (value ? `<g:${name}>${escXml(value)}</g:${name}>` : "");

/**
 * Google Merchant Center product feed item (RSS 2.0 with the g: namespace; Microsoft Merchant Center reads the same format).
 * Required fields are always present; an item without a picture is left out (Merchant refuses it), not given a stock photo.
 * Without a GTIN the item says `identifier_exists=no` rather than inventing one. Price is the site price in SAR.
 */
export function merchantItemXml(locale: Locale, p: MerchantFeedItem): string | null {
  const image = cdnImage(p.image);
  if (!image || !p.title || !(p.price > 0)) return null;
  const link = localizedUrl(locale, `/p/${encodeURIComponent(p.slug)}`);
  return [
    "<item>",
    tag("id", p.id),
    `<title>${escXml(clip(p.title, 150))}</title>`,
    `<description>${escXml(clip(p.description || p.title, 5000))}</description>`,
    `<link>${escXml(link)}</link>`,
    tag("image_link", image),
    tag("availability", p.available ? "in_stock" : "out_of_stock"),
    tag("price", `${p.price.toFixed(2)} ${p.currency || "SAR"}`),
    tag("condition", "new"),
    tag("brand", p.brand),
    p.gtin ? tag("gtin", p.gtin) : tag("identifier_exists", "no"),
    tag("product_type", p.category),
    tag("google_product_category", "491"), // Health & Beauty > Health Care
    "</item>",
  ].join("");
}

export function merchantFeedXml(locale: Locale, items: MerchantFeedItem[]): string {
  const body = items.map((i) => merchantItemXml(locale, i)).filter(Boolean).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Nabd Plus</title><link>${escXml(localizedUrl(locale))}</link><description>Nabd Plus products (${locale})</description>\n${body}\n</channel></rss>`;
}
