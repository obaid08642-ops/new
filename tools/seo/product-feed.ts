/**
 * A5: Product feeds from the eligible catalog.
 *
 * Generates three feed formats:
 * - Google Merchant Center (XML)
 * - Microsoft Merchant (XML)
 * - OpenAI product-feed (JSON)
 *
 * Each feed includes: GTIN (barcode), brand, availability, site price, image,
 * canonical link. Regenerated daily via cron.
 *
 * Usage:
 *   npx ts-node -T tools/seo/product-feed.ts --format google|microsoft|openai [--locale ar] [--out feeds/]
 */

import { MongoClient } from 'mongodb';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

const LOCALES = ['ar', 'en'];

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  canonical: string;
  brand: string;
  gtin: string;
  availability: 'in_stock' | 'out_of_stock';
}

async function main() {
  const format = process.argv[process.argv.indexOf('--format') + 1] || 'google';
  const locale = process.argv[process.argv.indexOf('--locale') + 1] || 'ar';
  const outDir = process.argv[process.argv.indexOf('--out') + 1] || 'feeds';
  const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/nabd_live';

  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db();

  // Eligible catalog: public, not deleted, OTC only (Rx never advertised)
  const medicines = await db.collection('medicines').find({
    public_eligibility: true,
    is_deleted: { $ne: true },
    requiresPrescription: { $ne: true },
  }).toArray();

  const products: Product[] = medicines.map((m: any) => ({
    id: m.id,
    title: m[`name_${locale}`] || m.name_en || m.name_ar || '',
    description: m[`description_${locale}`] || m.description_en || m.description_ar || '',
    price: m.price || 0,
    currency: 'SAR',
    image: m.image || m.images?.[0] || '',
    canonical: `https://nabd.plus/${locale}/p/${m.slug || m.id}`,
    brand: m.brand || m.manufacturer || '',
    gtin: m.barcode || m.gtin13 || '',
    availability: m.available === false ? 'out_of_stock' : 'in_stock',
  }));

  const resolvedOut = resolve(outDir);
  mkdirSync(resolvedOut, { recursive: true });

  if (format === 'google' || format === 'all') {
    const xml = generateGoogleFeed(products, locale);
    writeFileSync(join(resolvedOut, `google-${locale}.xml`), xml);
    console.log(`Google feed: ${products.length} products → google-${locale}.xml`);
  }

  if (format === 'microsoft' || format === 'all') {
    const xml = generateMicrosoftFeed(products, locale);
    writeFileSync(join(resolvedOut, `microsoft-${locale}.xml`), xml);
    console.log(`Microsoft feed: ${products.length} products → microsoft-${locale}.xml`);
  }

  if (format === 'openai' || format === 'all') {
    const json = generateOpenAIFeed(products, locale);
    writeFileSync(join(resolvedOut, `openai-${locale}.json`), JSON.stringify(json, null, 2));
    console.log(`OpenAI feed: ${products.length} products → openai-${locale}.json`);
  }

  await client.close();
}

function generateGoogleFeed(products: Product[], locale: string): string {
  const items = products.map((p) => `
    <item>
      <g:id>${p.id}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(p.description)}</g:description>
      <g:link>${p.canonical}</g:link>
      <g:image_link>${p.image}</g:image_link>
      <g:brand>${escapeXml(p.brand)}</g:brand>
      <g:gtin>${p.gtin}</g:gtin>
      <g:availability>${p.availability}</g:availability>
      <g:price>${p.price} ${p.currency}</g:price>
    </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Nabd Plus — ${locale}</title>
    <link>https://nabd.plus/${locale}</link>
    <description>Product feed</description>${items}
  </channel>
</rss>`;
}

function generateMicrosoftFeed(products: Product[], locale: string): string {
  const items = products.map((p) => `
    <Product>
      <ID>${p.id}</ID>
      <Title>${escapeXml(p.title)}</Title>
      <Description>${escapeXml(p.description)}</Description>
      <ProductURL>${p.canonical}</ProductURL>
      <ImageURL>${p.image}</ImageURL>
      <Brand>${escapeXml(p.brand)}</Brand>
      <GTIN>${p.gtin}</GTIN>
      <Availability>${p.availability}</Availability>
      <Price currency="${p.currency}">${p.price}</Price>
    </Product>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ProductFeed xmlns="http://www.microsoft.com/merchant/feed">
  <Products>${items}
  </Products>
</ProductFeed>`;
}

function generateOpenAIFeed(products: Product[], locale: string): {
  return {
    version: '1.0',
    locale,
    generated_at: new Date().toISOString(),
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: { amount: p.price, currency: p.currency },
      image: p.image,
      canonical_url: p.canonical,
      brand: p.brand,
      gtin: p.gtin,
      availability: p.availability,
    })),
  };
}

function escapeXml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
