import { describe, expect, it } from "vitest";
import { merchantFeedXml, merchantItemXml, type MerchantFeedItem } from "@/lib/merchant-feed";

const item = (o: Partial<MerchantFeedItem> = {}): MerchantFeedItem => ({
  id: "1001", slug: "panadol-500", title: "Panadol & Co <500mg>", description: "Pain relief", price: 12.5, currency: "SAR",
  available: true, image: "p/a.webp", brand: "GSK", gtin: "6281000000012", category: "Pain > Analgesics", ...o,
});

describe("Merchant Center feed", () => {
  it("writes every required field with escaped text, the localized canonical link and the site price", () => {
    const xml = merchantItemXml("en", item())!;
    expect(xml).toContain("<g:id>1001</g:id>");
    expect(xml).toContain("<title>Panadol &amp; Co &lt;500mg&gt;</title>");
    expect(xml).toContain("<link>https://nabd.plus/en/p/panadol-500</link>");
    expect(xml).toContain("<g:image_link>https://cdn.nabd.plus/p/a.webp</g:image_link>");
    expect(xml).toContain("<g:price>12.50 SAR</g:price>");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:gtin>6281000000012</g:gtin>");
    expect(xml).not.toContain("identifier_exists");
  });

  it("says identifier_exists=no without a GTIN, out_of_stock when unavailable, and uses the title when there is no description", () => {
    const xml = merchantItemXml("ar", item({ gtin: null, available: false, description: null, brand: null }))!;
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>");
    expect(xml).toContain("<description>Panadol &amp; Co &lt;500mg&gt;</description>");
    expect(xml).not.toContain("<g:brand>");
  });

  it("leaves out an item with no picture or no price instead of inventing one", () => {
    expect(merchantItemXml("en", item({ image: null }))).toBeNull();
    expect(merchantItemXml("en", item({ price: 0 }))).toBeNull();
    const feed = merchantFeedXml("en", [item({ image: null }), item({ id: "2" })]);
    expect(feed).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(feed.match(/<item>/g)).toHaveLength(1);
  });
});
