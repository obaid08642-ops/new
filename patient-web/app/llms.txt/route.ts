import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
const api = (process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus").replace(/\/$/, "");
const mcp = (process.env.NEXT_PUBLIC_MCP_URL || "https://mcp.nabd.plus").replace(/\/$/, "");

const LOCALES: Array<[string, string]> = [
  ["ar", "Arabic"], ["en", "English"], ["ur", "Urdu"], ["hi", "Hindi"], ["bn", "Bengali"], ["fil", "Filipino"],
];

/**
 * llms.txt (llmstxt.org): what Nabd Plus is and where its public pages are, in the six site
 * languages. Every URL here resolves (tests/ai-discovery-contract.test.ts); {lang} is one of
 * ar, en, ur, hi, bn, fil and every page exists in all six. The full list of pages is in
 * llms-full.txt and the sitemaps.
 */
const llmsText = `# Nabd Plus

> Nabd Plus is a Saudi healthcare platform: patients find doctors and book consultations (clinic, video, home visit), send medicine requests that pharmacies answer with offers, and book lab tests, radiology and home nursing. Payment is by Moyasar on Nabd Plus pages. Prescription medicines always need a prescription. The site is in Arabic, English, Urdu, Hindi, Bengali and Filipino.

## Home in each language

${LOCALES.map(([l, name]) => `- [${name} home](/${l}): Nabd Plus home in ${name}.`).join("\n")}

## Features

Public pages that describe what each Nabd Plus feature does today (all six languages at /{lang}/features/{slug}); using a feature needs a signed-in account.

- [Medication reminders](/ar/features/medication-reminders): Save reminders with a dose, frequency and times, see today's doses, refill dates and chronic medicines.
- [Pregnancy](/ar/features/pregnancy): Pregnancy week, trimester and due date from your entries, logged kicks and contractions, baby growth and a cycle estimate.
- [Mental health](/ar/features/mental-health): Mood journal and booking with psychiatry doctors; no diagnosis or scoring, urgent help is a call to the configured urgent-help number.
- [Nutrition](/ar/features/nutrition): Log meals and follow today's calories and water against daily targets you set.
- [Family](/ar/features/family): Family group with per-member permissions, a family calendar, family chat and emergency contacts.
- [Loyalty](/ar/features/loyalty): Nabd points balance and tier, rewards, health challenges and referral codes.
- [Online consultations](/ar/features/online-consultations): Book a video consultation with a doctor, pay online in advance, join the call from the appointment and message the doctor inside the booking.

## Public pages (each in ar, en, ur, hi, bn, fil)

- [Medicines and products](/ar/c): category listing; each product at ${origin}/{lang}/p/{slug} (the slug is translated per language) with price in SAR, active ingredient, dosage form, strength, and whether it needs a prescription.
- [Doctors](/ar/consultations/doctors): doctors who passed review; each doctor at ${origin}/{lang}/doctor/{slug}; [by specialty](/ar/consultations/specialties) and by specialty and city at ${origin}/{lang}/doctors/{specialty}/{city}.
- Hospitals and clinics: ${origin}/{lang}/facility/{slug}.
- Pharmacies: ${origin}/{lang}/pharmacy/{slug}; by city at ${origin}/{lang}/pharmacies/{city}.
- [Lab tests](/ar/diagnostics/labs): lab tests by city at ${origin}/{lang}/labs/{test}/{city}; [lab packages](/ar/diagnostics/packages).
- [Radiology](/ar/diagnostics/radiology): each service at ${origin}/{lang}/diagnostics/radiology/{id}.
- [Home nursing](/ar/nursing/catalog): the nursing catalogue; by city at ${origin}/{lang}/home-nursing/{city}, and one service in one city at ${origin}/{lang}/home-nursing/{city}/{service}.
- [Arabic articles](/ar/articles), [English articles](/en/articles): health articles; each at ${origin}/{lang}/articles/{slug}.
- Medical conditions: ${origin}/{lang}/condition/{code}.

## Full lists

- [llms-full.txt](/llms-full.txt): every public doctor, facility, pharmacy, condition, article, lab test, radiology and nursing service, with their pages in all six languages, and the product catalogue in each language.
- [Sitemap index](/sitemap.xml): every public page with its six language versions (hreflang).

## For AI agents

- [MCP server card](/.well-known/mcp/server-card.json): the Nabd Plus MCP server (${mcp}/api/v1/mcp). Search and detail tools are public; tools that act for a patient need the patient's sign-in (see auth.md).
- [Auth instructions](/auth.md): how an assistant signs a patient in, and what it can and cannot do. The patient always confirms and pays on Nabd Plus.
- [API catalog](/.well-known/api-catalog), [OpenAPI subset](/.well-known/openapi.json) and [AI catalog](/.well-known/ai-catalog.json): the public catalogue endpoints.
- Product search: ${api}/api/v1/public/products/search?q={term}&locale={lang} (by SKU: ${api}/api/v1/public/products/by-sku/{sku}?locale={lang}).
- Categories: ${api}/api/v1/public/categories/{lang}.

## Privacy and limits

- Patient records, appointments, prescriptions, messages, orders, family and health data are private. They are never public content and are only shown to the signed-in patient.
- Public pages give general information. They are not a diagnosis or treatment advice for a person, and prices and availability can change; the product page and the patient's order show the current values.
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
