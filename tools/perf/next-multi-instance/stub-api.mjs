// P14.10 rehearsal: a stand-in for the backend's public API (test data). One product whose name carries a version the
// test changes (POST /__version {"v":"2"}); every other path answers 404 {} so the pages render their empty states.
//   node stub-api.mjs 4010
import http from "node:http";

let version = "1";
const product = () => ({
  id: "rehearsal-product-1", sku: 990001, locale: "ar", name: `Rehearsal product v${version}`, official_name: `Rehearsal product v${version}`,
  slug: "rehearsal-product", slugs: { ar: "rehearsal-product", en: "rehearsal-product" }, description: "Test data for the multi-instance rehearsal.",
  indications: [], dosage_instructions: null, side_effects: [], warnings: [], storage_conditions: null, how_to_use: [],
  package_content_details: null, brand_benefits: null, category: null, sub_category: null, sub_sub_category: null,
  form: null, strength: null, package_size: null, active_ingredient: null, manufacturer: null, barcode: null,
  price: 10, old_price: null, discount_percent: 0, has_discount: false, currency: "SAR", is_rx: false, indexable: false,
  available_online: true, availability_status: "available", available: true, country_of_origin: null, images: [], image: null,
});

http.createServer((req, res) => {
  const url = new URL(req.url, "http://stub");
  if (req.method === "POST" && url.pathname === "/__version") {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => { version = JSON.parse(body || "{}").v || version; res.writeHead(200).end(version); });
    return;
  }
  if (/^\/api\/v1\/public\/product\/[a-z]+\/rehearsal-product$/.test(url.pathname)) {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(product()));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" }).end("{}");
}).listen(Number(process.argv[2] || 4010), "127.0.0.1");
