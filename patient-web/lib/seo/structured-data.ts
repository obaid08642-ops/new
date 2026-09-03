import type { Locale } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";

/** Structured-data builders. These NEVER fabricate price, availability or
 *  clinical facts — callers must pass only real, verified data. */
export function medicalWebPage(input: {
  title: string; description?: string | null; locale: Locale; path: string;
  datePublished?: string | null; dateModified?: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "MedicalWebPage",
    name: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    inLanguage: input.locale,
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

export function physician(input: { name: string; path: string; locale: Locale; specialty?: string | null; image?: string | null }): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "Physician",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    ...(input.specialty ? { medicalSpecialty: input.specialty } : {}),
    ...(input.image ? { image: input.image } : {}),
  };
}

export function service(input: { name: string; path: string; locale: Locale; provider?: string | null; description?: string | null }): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "Service",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    ...(input.provider ? { provider: { "@type": "Organization", name: input.provider } } : {}),
    ...(input.description ? { description: input.description } : {}),
    serviceType: "HealthCareService",
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
    "@context": "https://schema.org", "@type": "MedicalProcedure",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    inLanguage: input.locale,
    procedureType: "Diagnostic",
    ...(input.description ? { description: input.description } : {}),
  };
}

export function nursingService(input: {
  name: string; path: string; locale: Locale; description?: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "MedicalProcedure",
    name: input.name,
    url: `${siteOrigin()}/${input.locale}${input.path}`,
    inLanguage: input.locale,
    procedureType: "Nursing",
    ...(input.description ? { description: input.description } : {}),
  };
}


