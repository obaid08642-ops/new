// Stand-in for the backend's public product API (TEST DATA) with a switch: `PUT /__mode/down` makes every /api/v1 request answer 503
// (the backend restarting during a deploy), `PUT /__mode/ok` brings it back. Any slug "p-<n>" is a product.
//   node stub-api.mjs 4010 [bind address, default 127.0.0.1]
import http from "node:http";

let down = false;
const product = (slug, locale) => ({
  id: `med_${slug}`, sku: 100000 + Number(slug.slice(2)), locale, name: `Test medicine ${slug}`, official_name: `Test medicine ${slug} 500 mg`,
  slug, slugs: { ar: slug, en: slug }, description: "نص تجريبي عن الدواء", indications: ["دواعي الاستعمال التجريبية"], dosage_instructions: "الجرعة التجريبية", side_effects: ["آثار جانبية تجريبية"], warnings: ["تحذيرات تجريبية"],
  storage_conditions: "يحفظ في مكان بارد", how_to_use: ["طريقة الاستعمال التجريبية"], package_content_details: null, brand_benefits: null, category: null, sub_category: null, sub_sub_category: null,
  form: "Tablet", strength: "500 mg", package_size: "20", active_ingredient: "Test ingredient", manufacturer: "Test maker", barcode: null,
  price: 10, old_price: null, discount_percent: 0, has_discount: false, currency: "SAR", is_rx: false, indexable: false,
  available_online: true, availability_status: "available", available: true, country_of_origin: null, images: [], image: null,
});

http.createServer((req, res) => {
  const url = new URL(req.url, "http://stub");
  const mode = /^\/__mode\/(up|ok|down)$/.exec(url.pathname);
  if (mode && req.method === "PUT") { down = mode[1] === "down"; return res.writeHead(200).end(down ? "down" : "ok"); }
  if (down) return res.writeHead(503, { "content-type": "application/json" }).end("{}");
  const m = /^\/api\/v1\/public\/product\/([a-z]+)\/(p-\d+)$/.exec(url.pathname);
  if (m) return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(product(m[2], m[1])));
  res.writeHead(404, { "content-type": "application/json" }).end("{}");
}).listen(Number(process.argv[2] || 4010), process.argv[3] || "127.0.0.1");
