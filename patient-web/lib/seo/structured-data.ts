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
