// ---------------------------------------------------------------------------
// SEO & Structured Data helpers for Nabdah Plus
// Generates JSON-LD, Open Graph, and meta tags for web indexing.
// ---------------------------------------------------------------------------

export interface DoctorSEO {
  id: string;
  nameAr: string;
  nameEn: string;
  specialty: string;
  specialtyEn: string;
  rating: number;
  reviewCount: number;
  price: number;
  hospital: string;
  city: string;
  imageUrl?: string;
  slug: string;
}

export interface MedicineSEO {
  productId: string;
  nameAr: string;
  nameEn: string;
  activeIngredient: string;
  category: string;
  uses: string[];
  warnings: string[];
  sideEffects: string[];
  interactions: string[];
  pregnancy: string;
  breastfeeding: string;
  imageUrl?: string;
  price?: number;
  insuranceCoverage?: string[];
  alternatives?: string[];
  slug: string;
}

export interface LabTestSEO {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  description: string;
  price: number;
  turnaround: string;
  slug: string;
}

export interface NursingServiceSEO {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  basePrice: number;
  slug: string;
}

const WEB_BASE = 'https://nabdahplus.com';

// ---------------------------------------------------------------------------
// JSON-LD Schema generators
// ---------------------------------------------------------------------------

export function generateDoctorSchema(doctor: DoctorSEO): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: doctor.nameEn,
    alternateName: doctor.nameAr,
    medicalSpecialty: doctor.specialtyEn,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: doctor.rating,
      reviewCount: doctor.reviewCount,
      bestRating: 5,
    },
    priceRange: `${doctor.price} SAR`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: doctor.city,
      addressCountry: 'SA',
    },
    memberOf: {
      '@type': 'MedicalOrganization',
      name: doctor.hospital,
    },
    image: doctor.imageUrl,
    url: `${WEB_BASE}/doctors/${doctor.slug}`,
  };
}

export function generateDrugSchema(medicine: MedicineSEO): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Drug',
    name: medicine.nameEn,
    alternateName: medicine.nameAr,
    activeIngredient: medicine.activeIngredient,
    drugClass: medicine.category,
    description: medicine.uses.join('. '),
    warning: medicine.warnings.join('. '),
    adverseOutcome: medicine.sideEffects.join(', '),
    interactingDrug: medicine.interactions.join(', '),
    pregnancyCategory: medicine.pregnancy,
    url: `${WEB_BASE}/medicines/${medicine.slug}`,
    image: medicine.imageUrl,
    offers: medicine.price
      ? {
          '@type': 'Offer',
          price: medicine.price,
          priceCurrency: 'SAR',
          availability: 'https://schema.org/InStock',
        }
      : undefined,
  };
}

export function generateLabTestSchema(test: LabTestSEO): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalTest',
    name: test.nameEn,
    alternateName: test.nameAr,
    description: test.description,
    usedToDiagnose: test.category,
    url: `${WEB_BASE}/labs/${test.slug}`,
    offers: {
      '@type': 'Offer',
      price: test.price,
      priceCurrency: 'SAR',
    },
  };
}

export function generateNursingSchema(service: NursingServiceSEO): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    name: service.nameEn,
    alternateName: service.nameAr,
    description: service.description,
    url: `${WEB_BASE}/nursing/${service.slug}`,
    offers: {
      '@type': 'Offer',
      price: service.basePrice,
      priceCurrency: 'SAR',
    },
  };
}

export function generateMedicalOrgSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    name: 'Nabdah Plus',
    alternateName: 'نبض بلس',
    url: WEB_BASE,
    logo: `${WEB_BASE}/logo.png`,
    description:
      'Nabdah Plus is a comprehensive healthcare platform in Saudi Arabia offering doctor consultations, pharmacy delivery, lab tests, home nursing, and more.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'SA',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+966-XXX-XXXX',
      contactType: 'customer service',
      availableLanguage: ['Arabic', 'English'],
    },
    sameAs: [
      'https://twitter.com/nabdahplus',
      'https://instagram.com/nabdahplus',
    ],
  };
}

// ---------------------------------------------------------------------------
// Open Graph & Twitter Card meta
// ---------------------------------------------------------------------------

export interface OpenGraphMeta {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
}

export function generateOpenGraph(meta: OpenGraphMeta): Record<string, string> {
  return {
    'og:title': meta.title,
    'og:description': meta.description,
    'og:url': meta.url,
    'og:image': meta.image ?? `${WEB_BASE}/og-default.png`,
    'og:type': meta.type ?? 'website',
    'og:site_name': 'Nabdah Plus',
    'og:locale': 'ar_SA',
    'twitter:card': 'summary_large_image',
    'twitter:site': '@nabdahplus',
    'twitter:title': meta.title,
    'twitter:description': meta.description,
    'twitter:image': meta.image ?? `${WEB_BASE}/og-default.png`,
  };
}

// ---------------------------------------------------------------------------
// Breadcrumb Schema
// ---------------------------------------------------------------------------

export function generateBreadcrumb(
  items: { name: string; url: string }[],
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
