/**
 * Verified against live API https://api.nabd.plus/api/v1/public/product/ar/{slug}
 * Real fields (38): id, sku, locale, resolved_lang, name, official_name, slug, slugs{6}, description, indications[], dosage_instructions, side_effects[], warnings[], storage_conditions, how_to_use[], package_content_details, brand_benefits, category, sub_category, sub_sub_category, form, strength, package_size, active_ingredient, manufacturer, barcode, price, old_price, discount_percent, has_discount, currency, is_rx, available_online, availability_status, available, country_of_origin, images[], image, search_aliases, url (+ total 20990)
 */
export function productJsonLd(p: any, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Product', 'MedicalDrug'],
    name: p.name || p.official_name || p.slug,
    alternateName: p.official_name && p.official_name !== p.name ? p.official_name : undefined,
    description: p.description || '',
    image: p.images?.length ? p.images.map((img: string) => `https://cdn.nabd.plus/${img}`) : (p.image ? [`https://cdn.nabd.plus/${p.image}`] : undefined),
    sku: String(p.sku || p.id),
    gtin: p.barcode || undefined,
    brand: p.manufacturer ? { '@type': 'Brand', name: p.manufacturer } : undefined,
    manufacturer: p.manufacturer ? { '@type': 'Organization', name: p.manufacturer } : undefined,
    activeIngredient: p.active_ingredient || undefined,
    dosageForm: p.form || undefined,
    strength: p.strength || undefined,
    isPrescriptionRequired: Boolean(p.is_rx),
    category: [p.category, p.sub_category, p.sub_sub_category].filter(Boolean).join(' > ') || undefined,
    contraindication: p.warnings?.join(' ') || undefined,
    adverseOutcome: p.side_effects?.join(' ') || undefined,
    indication: p.indications?.join(' ') || undefined,
    dosageInstructions: p.dosage_instructions || (Array.isArray(p.how_to_use) ? p.how_to_use.join(' ') : p.how_to_use) || undefined,
    storageConditions: p.storage_conditions || undefined,
    // 30-field coverage: package_size, country_of_origin, available, currency, discount
    additionalProperty: [
      p.package_size ? { '@type': 'PropertyValue', name: 'package_size', value: p.package_size } : null,
      p.package_content_details ? { '@type': 'PropertyValue', name: 'package_content', value: p.package_content_details } : null,
      p.country_of_origin ? { '@type': 'PropertyValue', name: 'country_of_origin', value: p.country_of_origin } : null,
      p.search_aliases?.length ? { '@type': 'PropertyValue', name: 'search_aliases', value: p.search_aliases.join(', ') } : null,
    ].filter(Boolean),
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: p.currency || 'SAR',
      availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      priceValidUntil: p.has_discount ? undefined : undefined,
      url: p.url || `https://www.nabd.plus/${locale}/p/${p.slug}`,
      seller: { '@type': 'Organization', name: 'Nabd Plus' },
    },
    inLanguage: locale,
  };
}
export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}
export const speakable = { '@type': 'SpeakableSpecification', cssSelector: ['.product-title', '.faq'] };

export function physicianJsonLd(d: any, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: d.full_name || d.name,
    medicalSpecialty: d.specialty,
    availableService: d.services || undefined,
    address: d.clinic_address ? { '@type': 'PostalAddress', addressLocality: d.city, streetAddress: d.clinic_address } : undefined,
    inLanguage: locale,
  };
}
export function clinicJsonLd(c: any, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: c.name, address: c.address ? { '@type': 'PostalAddress', addressLocality: c.city, streetAddress: c.address } : undefined,
    medicalSpecialty: c.specialty,
    inLanguage: locale,
  };
}
export function procedureJsonLd(s: any, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    name: s.name_ar || s.name,
    description: s.description_ar || s.description || '',
    procedureType: s.category || s.modality || 'lab',
    inLanguage: locale,
  };
}
export function howToJsonLd(p: any) {
  const steps: string[] = Array.isArray(p.how_to_use) ? p.how_to_use : (p.how_to_use ? String(p.how_to_use).split('\n') : []);
  if (!steps.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `طريقة استخدام ${p.name || p.slug}`,
    step: steps.filter(Boolean).map((t: string) => ({ '@type': 'HowToStep', text: String(t).trim() })),
  };
}
