import { NextRequest, NextResponse } from "next/server";
import { getPublicProduct } from "@/lib/api/public-products-server";
import { isLocale } from "@/lib/i18n";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

const staticMarkdown: Record<string, string> = {
  "/": `# Nabd Plus\n\nNabd Plus is an integrated healthcare and pharmacy platform in Saudi Arabia. Public content is open for AI search, product discovery, and booking.\n\n- [Pharmacy Catalog](${origin}/ar/medicine-catalog)\n- [Health Articles](${origin}/ar/articles)\n- [API Catalog](${origin}/.well-known/api-catalog)\n`,
  "/en": `# Nabd Plus\n\nNabd Plus public patient portal. Discover prescription & OTC medications, doctors, labs, and home care services across Saudi Arabia.\n`,
  "/ar": `# نبض بلس\n\nمنصة الرعاية الصحية والصيدليات المتكاملة في المملكة العربية السعودية. استكشف الأدوية والوصفات الطبية، والأطباء، والمختبرات، والتمريض المنزلي.\n`,
  "/ur": `# نبض پلس\n\nسعودی عرب میں صحت اور ادویات کا جامع پلیٹ فارم۔ ادویات، ڈاکٹرز اور ٹیسٹ کی بکنگ۔\n`,
  "/hi": `# नब्ज़ प्लस (Nabd Plus)\n\nसऊदी अरब में स्वास्थ्य सेवा और फार्मेसी प्लेटफॉर्म। दवाएं, डॉक्टर और लैब परीक्षण।\n`,
  "/bn": `# নবদ প্লাস (Nabd Plus)\n\nসৌদি আরবে সমন্বিত স্বাস্থ্যসেবা ও ফার্মেসি প্ল্যাটফর্ম। ওষুধ, ডাক্তার ও হোম কেয়ার সেবা।\n`,
  "/fil": `# Nabd Plus\n\nPinag-isang platform para sa pangangalagang pangkalusugan at botika sa Saudi Arabia. Mga gamot, doktor, at pagsusuri sa lab.\n`,
  "/en/articles": `# Nabd Plus Health Articles\n\nEvidence-based health knowledge and medical guides verified by healthcare professionals.\n`,
  "/ar/articles": `# مقالات نبض بلس الطبية\n\nمعلومات صحية وطبية موثوقة ومحدثة معتمدة من أطباء وخبراء الرعاية الصحية.\n`,
  "/en/medicine-catalog": `# Nabd Plus Medicine Catalog\n\nComprehensive catalog of over 20,000 SFDA-registered medications with official pricing, active ingredients, and availability in Saudi Arabia.\n`,
  "/ar/medicine-catalog": `# دليل أدوية نبض بلس\n\nكتالوج شامل يضم أكثر من 20,000 دواء مسجل لدى الهيئة العامة للغذاء والدواء بالأسعار الرسمية والبدائل والمادة الفعالة.\n`
};

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") || "/";

  // Check static dictionary first
  if (staticMarkdown[path]) {
    return new NextResponse(staticMarkdown[path], {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": "text/markdown; charset=utf-8",
        "Vary": "Accept",
        "X-Markdown-Tokens": "public-boundary,source-links",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }

  // Dynamic product page markdown: /{locale}/p/{slug}
  const productMatch = /^\/([a-z]{2,3})\/p\/([^/]+)$/.exec(path);
  if (productMatch) {
    const [, locale, slug] = productMatch;
    if (isLocale(locale)) {
      try {
        const product = await getPublicProduct(locale, slug);
        if (product) {
          const name = product.name || product.official_name || "Product";
          const price = product.price != null ? `${product.price} SAR` : "N/A";
          const availability = product.available ? "Available in Stock" : "Limited Availability / Broadcast Required";
          const activeIng = product.active_ingredient || "Not specified";
          const manufacturer = product.manufacturer || "Not specified";
          const form = product.form || "";
          const strength = product.strength || "";
          const isRx = product.is_rx ? "Yes (Prescription Required)" : "No (Over The Counter / OTC)";
          const buyUrl = `${origin}/${locale}/p/${encodeURIComponent(product.slug)}`;

          const md = `# ${name}

- **SKU:** ${product.sku || "N/A"}
- **Price:** ${price}
- **Availability:** ${availability}
- **Prescription Required:** ${isRx}
- **Active Ingredient:** ${activeIng}
- **Dosage Form & Strength:** ${[form, strength].filter(Boolean).join(" - ") || "N/A"}
- **Manufacturer:** ${manufacturer}
- **Country of Origin:** ${product.country_of_origin || "N/A"}
- **Buy / Order URL:** [${name}](${buyUrl})

## Description
${product.description || name}

${product.indications?.length ? `## Indications\n${product.indications.map((i: string) => `- ${i}`).join("\n")}\n` : ""}
${product.warnings?.length ? `## Warnings & Precautions\n${product.warnings.map((w: string) => `- ${w}`).join("\n")}\n` : ""}
${product.how_to_use?.length ? `## How to Use\n${product.how_to_use.map((h: string) => `- ${h}`).join("\n")}\n` : ""}
`;

          return new NextResponse(md, {
            headers: {
              "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
              "Content-Type": "text/markdown; charset=utf-8",
              "Vary": "Accept",
              "X-Markdown-Tokens": "public-boundary,ai-commerce,source-links",
              "X-Content-Type-Options": "nosniff"
            }
          });
        }
      } catch (err) {
        console.error("Agent markdown product fetch error:", err);
      }
    }
  }

  return new NextResponse("Markdown representation is not available for this resource.\n", {
    status: 406,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" }
  });
}
