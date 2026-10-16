// #1603 proof: a stand-in for the backend's public product API (TEST DATA, no real catalogue). Any slug "p-<n>" is a
// product with a realistic amount of text (about 5 KB of JSON: description, indications, dosage, side effects,
// warnings, storage, how to use), so a rendered page is about the size of a real medicine page. Other paths: 404 {}.
//   node stub-api.mjs 4010 [bind address, default 127.0.0.1]
import http from "node:http";

const para = (n, seed) => Array.from({ length: n }, (_, i) => `جملة رقم ${i + 1} من نص تجريبي عن الدواء ${seed} لقياس حجم الصفحة المخزنة في الكاش`).join(" . ");
const list = (n, seed) => Array.from({ length: n }, (_, i) => `بند ${i + 1}: ${para(2, seed + i)}`);
const product = (slug, locale) => ({
  id: `med_${slug}`, sku: 100000 + Number(slug.slice(2)), locale, name: `Test medicine ${slug}`, official_name: `Test medicine ${slug} 500 mg`,
  slug, slugs: { ar: slug, en: slug }, description: para(14, slug), indications: list(6, 1), dosage_instructions: para(5, slug),
  side_effects: list(8, 2), warnings: list(5, 3), storage_conditions: para(2, slug), how_to_use: list(4, 4),
  package_content_details: null, brand_benefits: null, category: null, sub_category: null, sub_sub_category: null,
  form: "Tablet", strength: "500 mg", package_size: "20", active_ingredient: "Test ingredient", manufacturer: "Test maker", barcode: null,
  price: 10, old_price: null, discount_percent: 0, has_discount: false, currency: "SAR", is_rx: false, indexable: false,
  available_online: true, availability_status: "available", available: true, country_of_origin: null, images: [], image: null,
});

http.createServer((req, res) => {
  const m = /^\/api\/v1\/public\/product\/([a-z]+)\/(p-\d+)$/.exec(new URL(req.url, "http://stub").pathname);
  if (m) return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(product(m[2], m[1])));
  res.writeHead(404, { "content-type": "application/json" }).end("{}");
}).listen(Number(process.argv[2] || 4010), process.argv[3] || "127.0.0.1");
