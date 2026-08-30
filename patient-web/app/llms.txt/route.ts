import { NextResponse } from "next/server";

const llmsText = `# Nabd Plus

> Nabd Plus is a patient web portal. Public content is limited to the published website entry points; patient data always requires an authenticated server session.

## Public entry points

- [Arabic home](/ar): Public Nabd Plus patient portal entry point.
- [English home](/en): Public Nabd Plus patient portal entry point.
- [Urdu home](/ur): Public Nabd Plus patient portal entry point.
- [Hindi home](/hi): Public Nabd Plus patient portal entry point.
- [Bengali home](/bn): Public Nabd Plus patient portal entry point.
- [Filipino home](/fil): Public Nabd Plus patient portal entry point.
- [Arabic articles](/ar/articles): Public article listing, populated only from published backend content.
- [English articles](/en/articles): Public article listing, populated only from published backend content.

## Public product catalog (v14)

- [Product pages](/{lang}/p/{slug}): Fully localized product pages per locale (ar, en, ur, hi, bn, fil) with price (SAR), availability, dosage form, strength, active ingredient and structured data (Product, MedicalDrug, FAQPage, BreadcrumbList).
- [Category clusters](/{lang}/c/{main}[/{sub}]): Paginated, indexable category listings with live product counts.
- Product API: GET https://api.nabd.plus/api/v1/public/products/search?q={term}&locale={ar|en|ur|hi|bn|fil} — localized, buy-ready product search (sku, price, availability, canonical URL).
- Product by SKU: GET https://api.nabd.plus/api/v1/public/products/by-sku/{sku}?locale={lang}.
- Product by slug: GET https://api.nabd.plus/api/v1/public/product/{locale}/{slug} — strict single-locale DTO (no mixed-language fields).
- Categories: GET https://api.nabd.plus/api/v1/public/categories/{locale} — localized category tree with counts.
- Product sitemaps: [/sitemap.xml](/sitemap.xml) → /sitemaps/products/{locale}/{page}.xml.

Language resolution is strict: for a given locale, every field resolves from that locale's translation, falling back to English then Arabic per field — product content is never mixed between languages.

## Agent discovery

- [API catalog](https://nabd.plus/.well-known/api-catalog): RFC 9727 Linkset for the limited public catalog subset.
- [OpenAPI subset](https://nabd.plus/.well-known/openapi.json): Public catalog operations only; not the private patient API.
- [ARD catalog](https://nabd.plus/.well-known/ai-catalog.json): Public capabilities discoverable by agents.
- [Agent Skills index](https://nabd.plus/.well-known/agent-skills/index.json): Public-content skill only.
- [Auth instructions](https://nabd.plus/auth.md): Current authentication boundary and agent-access status.

No public OAuth/OIDC authorization server, OAuth protected-resource metadata, MCP server card, WebMCP tool surface, or DNS-AID records are enabled by this website deployment. Agents must not infer those capabilities from the patient web login.

## Privacy and content boundaries

- Patient records, appointments, prescriptions, conversations, notifications, family data, reminders, and health information are private and must not be treated as public content.
- Public pages do not provide medical diagnosis, treatment recommendations, pricing promises, or patient-specific advice.
- Catalogue information is sourced from the authorized backend when available. Its publication and classification boundaries are controlled by backend contracts.
`;

export function GET() {
  return new NextResponse(llmsText, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
