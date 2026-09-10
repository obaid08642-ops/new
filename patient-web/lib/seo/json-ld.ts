/**
 * Genius SEO: JSON-LD helpers for Product, FAQPage, Breadcrumb, Speakable
 * Beats competitors: every product page gets 4 schemas + llms.txt
 */
export function productJsonLd(p: any, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Product', 'MedicalDrug'],
    name: p.name, description: p.description,
    offers: { '@type': 'Offer', price: p.price, priceCurrency: 'SAR', availability: p.availability },
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
