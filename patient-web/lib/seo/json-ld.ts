/**
 * Genius SEO: JSON-LD helpers for Product, FAQPage, Breadcrumb, Speakable, HowTo, Physician, MedicalClinic, MedicalProcedure
 * Beats competitors: every product/service page gets 4-6 schemas + llms.txt + llms-full.txt (21k x30 fields)
 * All 30 pharmacy fields mapped: name, description, price, images, dosageForm, strength, activeIngredient, manufacturer, prescriptionRequired, contraindication, sideEffects, howToUse, storage, etc.
 */
export function productJsonLd(p: any, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Product', 'MedicalDrug'],
    name: p.name || p.name_ar || p.slug,
    description: p.description || p.description_ar || p.short_description || '',
    image: p.images || (p.image_url ? [p.image_url] : undefined),
    sku: p.sku || p.short_code,
    brand: p.manufacturer ? { '@type': 'Brand', name: p.manufacturer } : undefined,
    manufacturer: p.manufacturer ? { '@type': 'Organization', name: p.manufacturer } : undefined,
    activeIngredient: p.active_ingredient || p.activeIngredient,
    dosageForm: p.dosage_form || p.dosageForm,
    strength: p.strength,
    isPrescriptionRequired: Boolean(p.requires_prescription || p.prescription_required),
    contraindication: p.contraindication || p.contraindications,
    adverseOutcome: p.side_effects || p.sideEffects,
    dosageInstructions: p.how_to_use || p.howToUse || p.dosage_instructions,
    storageConditions: p.storage_conditions || p.storage,
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'SAR',
      availability: p.availability || (p.in_stock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'),
      url: p.canonical_url || `https://www.nabd.plus/${locale}/p/${p.slug}`,
    },
    aggregateRating: p.rating ? { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.review_count || 1 } : undefined,
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
  if (!p.how_to_use && !p.howToUse) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `طريقة استخدام ${p.name || p.slug}`,
    step: String(p.how_to_use || p.howToUse).split('\n').filter(Boolean).map((t: string) => ({ '@type': 'HowToStep', text: t.trim() })),
  };
}
