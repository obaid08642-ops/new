import type { Locale } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";

/** Structured-data builders. These NEVER fabricate price, availability or
 *  clinical facts — callers must pass only real, verified data. */
export function medicalWebPage(input: {
  title: string; description?: string | null; locale: Locale; path: string;
  datePublished?: string | null; dateModified?: string | null;
  /** The page carries a DirectAnswer (AEO): voice assistants read the title and that answer. */
  speakable?: boolean;
  /** What the page is about (a feature or topic name), and the CSS selectors a voice assistant may read aloud. */
  about?: string | null; speakableSelectors?: string[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "MedicalWebPage",
    name: input.title,
    ...(input.speakable ? { speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", ".nabd-direct-answer"] } } : {}),
    ...(input.description ? { description: input.description } : {}),
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    inLanguage: input.locale,
    ...(input.about ? { about: { "@type": "Thing", name: input.about } } : {}),
    ...(input.speakableSelectors?.length ? { speakable: { "@type": "SpeakableSpecification", cssSelector: input.speakableSelectors } } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

export function breadcrumbList(items: Array<{ name: string; locale: Locale; path: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem", position: index + 1,
      name: item.name, item: `${siteOrigin()}/${item.locale}${item.path}`,
    })),
  };
}

export function physician(input: { name: string; path: string; locale: Locale; specialty?: string | null; image?: string | null; city?: string | null; ratingValue?: number | null; reviewCount?: number | null }): Record<string, unknown> {
  const rating = Number(input.ratingValue);
  const count = Number(input.reviewCount);
  return {
    "@context": "https://schema.org", "@type": "Physician",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    ...(input.specialty ? { medicalSpecialty: input.specialty } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.city ? { address: { "@type": "PostalAddress", addressLocality: input.city, addressCountry: "SA" } } : {}),
    // AggregateRating ONLY from live approved-review aggregates; omitted when count is 0.
    ...(rating > 0 && count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Math.min(5, Math.max(1, Math.round(rating * 10) / 10)), reviewCount: Math.floor(count) } } : {}),
  };
}

export function service(input: {
  name: string; path: string; locale: Locale; provider?: string | null; description?: string | null; serviceType?: string; areaServed?: string | null;
  /** A city the service is offered in (areaServed City); `areaServed` names a country. */
  city?: string | null;
  /** What providers charge, when someone priced it: the range and how many providers priced it (AggregateOffer). Nothing is emitted without a price. */
  offers?: { low: number; high: number; currency: string; count: number } | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "Service",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    ...(input.provider ? { provider: { "@type": "Organization", name: input.provider } } : {}),
    ...(input.description ? { description: input.description } : {}),
    serviceType: input.serviceType ?? "HealthCareService",
    ...(input.areaServed ? { areaServed: { "@type": "Country", name: input.areaServed } } : {}),
    ...(input.city ? { areaServed: { "@type": "City", name: input.city } } : {}),
    ...(input.offers ? { offers: { "@type": "AggregateOffer", lowPrice: input.offers.low, highPrice: input.offers.high, priceCurrency: input.offers.currency, offerCount: input.offers.count } } : {}),
  };
}

export function medicalClinic(input: { name: string; path: string; locale: Locale; city?: string | null }): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "MedicalClinic",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    ...(input.city ? { address: { "@type": "PostalAddress", addressLocality: input.city } } : {}),
  };
}

export function hospital(input: { name: string; path: string; locale: Locale; city?: string | null; district?: string | null }): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "Hospital",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    address: {
      "@type": "PostalAddress",
      ...(input.city ? { addressLocality: input.city } : {}),
      ...(input.district ? { streetAddress: input.district } : {}),
      addressCountry: "SA",
    },
  };
}

export function pharmacy(input: { name: string; path: string; locale: Locale; city?: string | null }): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "Pharmacy",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    ...(input.city ? { address: { "@type": "PostalAddress", addressLocality: input.city, addressCountry: "SA" } } : {}),
  };
}

export function medicalCondition(input: { name: string; path: string; locale: Locale; symptoms?: string[]; overview?: string | null }): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "MedicalCondition",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    inLanguage: input.locale,
    ...(input.overview ? { description: input.overview } : {}),
    ...(input.symptoms?.length ? { signOrSymptom: input.symptoms.map(s => ({ "@type": "MedicalSymptom", name: s })) } : {}),
  };
}

export function labTest(input: {
  name: string; path: string; locale: Locale; description?: string | null; sampleType?: string | null; fastHours?: number | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "MedicalTest",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    inLanguage: input.locale,
    ...(input.description ? { description: input.description } : {}),
    ...(input.sampleType ? { relevantSpecialty: "MedicalPathology" } : {}),
  };
}

export function radiologyService(input: {
  name: string; path: string; locale: Locale; description?: string | null;
}): Record<string, unknown> {
  return {
    // schema.org DiagnosticProcedure ("Diagnostic" is not a MedicalProcedureType value)
    "@context": "https://schema.org", "@type": "DiagnosticProcedure",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    inLanguage: input.locale,
    ...(input.description ? { description: input.description } : {}),
  };
}

export function nursingService(input: {
  name: string; path: string; locale: Locale; description?: string | null;
}): Record<string, unknown> {
  return {
    // a home nursing service; "Nursing" is not a MedicalProcedureType value, so no procedureType
    "@context": "https://schema.org", "@type": "MedicalProcedure",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    inLanguage: input.locale,
    ...(input.description ? { description: input.description } : {}),
  };
}


