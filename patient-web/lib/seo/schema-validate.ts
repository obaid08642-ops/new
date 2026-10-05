/**
 * Minimal schema.org validator for the JSON-LD the site emits (13.R16 Verify:
 * "schema validator passes on samples"). For every node with an @type it
 * checks that the type is a known schema.org type, that the required
 * properties are present and non-empty, that every property belongs to the
 * type (or one of the node's types), and that enumeration-valued properties
 * use schema.org enumeration members. Nested typed nodes are validated too.
 *
 * Property lists follow schema.org (including inherited properties the site
 * uses); required lists follow the rich-result requirements for each type.
 */
type Spec = { required: string[]; allowed: string[] };

const THING = ['@context', '@type', '@id', 'name', 'alternateName', 'description', 'image', 'url', 'sameAs', 'identifier', 'additionalType'];
const CREATIVE_WORK = ['inLanguage', 'speakable', 'author', 'datePublished', 'dateModified', 'headline', 'publisher', 'mainEntity', 'about', 'keywords'];
const ORGANIZATION = ['address', 'telephone', 'logo', 'aggregateRating', 'review', 'areaServed', 'location', 'brand', 'email', 'contactPoint', 'memberOf'];
const LOCAL_BUSINESS = [...ORGANIZATION, 'openingHours', 'openingHoursSpecification', 'priceRange', 'geo', 'currenciesAccepted', 'paymentAccepted', 'hasMap'];
const MEDICAL_ORG = ['medicalSpecialty', 'isAcceptingNewPatients', 'healthPlanNetworkId'];
const MEDICAL_ENTITY = ['code', 'guideline', 'legalStatus', 'medicineSystem', 'recognizingAuthority', 'relevantSpecialty', 'study'];
const PRODUCT = ['sku', 'gtin', 'gtin8', 'gtin12', 'gtin13', 'gtin14', 'mpn', 'brand', 'manufacturer', 'category', 'additionalProperty', 'offers', 'aggregateRating', 'review', 'color', 'model', 'countryOfOrigin'];
const DRUG = [
  'activeIngredient', 'administrationRoute', 'availableStrength', 'dosageForm', 'doseSchedule', 'drugClass', 'drugUnit',
  'isAvailableGenerically', 'isProprietary', 'labelDetails', 'nonProprietaryName', 'prescribingInfo', 'prescriptionStatus',
  'proprietaryName', 'warning', 'interactingDrug', 'maximumIntake', 'mechanismOfAction', 'pregnancyWarning', 'breastfeedingWarning',
];
const MEDICAL_PROCEDURE = ['bodyLocation', 'followup', 'howPerformed', 'preparation', 'procedureType', 'status'];

export const SCHEMA_SPECS: Record<string, Spec> = {
  Product: { required: ['name'], allowed: [...THING, ...PRODUCT, 'inLanguage', 'speakable'] },
  // Drug is a schema.org MedicalEntity > Substance and a Product.
  Drug: { required: ['name'], allowed: [...THING, ...MEDICAL_ENTITY, ...DRUG, ...PRODUCT, 'inLanguage', 'speakable'] },
  Offer: { required: ['price', 'priceCurrency', 'availability'], allowed: [...THING, 'price', 'priceCurrency', 'availability', 'seller', 'itemCondition', 'priceValidUntil', 'shippingDetails', 'hasMerchantReturnPolicy'] },
  Organization: { required: ['name'], allowed: [...THING, ...ORGANIZATION] },
  Brand: { required: ['name'], allowed: [...THING, 'logo'] },
  PropertyValue: { required: ['name', 'value'], allowed: [...THING, 'value', 'unitCode', 'unitText', 'propertyID'] },
  FAQPage: { required: ['mainEntity'], allowed: [...THING, ...CREATIVE_WORK] },
  Question: { required: ['name', 'acceptedAnswer'], allowed: [...THING, 'acceptedAnswer', 'text', 'answerCount'] },
  Answer: { required: ['text'], allowed: [...THING, 'text'] },
  BreadcrumbList: { required: ['itemListElement'], allowed: [...THING, 'itemListElement'] },
  ListItem: { required: ['position', 'name'], allowed: [...THING, 'position', 'item'] },
  HowTo: { required: ['name', 'step'], allowed: [...THING, ...CREATIVE_WORK, 'step', 'totalTime', 'supply', 'tool'] },
  HowToStep: { required: ['text'], allowed: [...THING, 'text', 'position'] },
  SpeakableSpecification: { required: [], allowed: ['@type', 'cssSelector', 'xpath'] },
  // Physician is a MedicalBusiness (LocalBusiness) and a MedicalOrganization.
  Physician: { required: ['name'], allowed: [...THING, ...LOCAL_BUSINESS, ...MEDICAL_ORG, 'availableService', 'hospitalAffiliation', 'usNPI'] },
  MedicalBusiness: { required: ['name'], allowed: [...THING, ...LOCAL_BUSINESS, ...MEDICAL_ORG] },
  PostalAddress: { required: [], allowed: ['@type', 'streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry'] },
  AggregateRating: { required: ['ratingValue'], allowed: ['@type', 'ratingValue', 'reviewCount', 'ratingCount', 'bestRating', 'worstRating'] },
  MedicalProcedure: { required: ['name'], allowed: [...THING, ...MEDICAL_ENTITY, ...MEDICAL_PROCEDURE, 'inLanguage'] },
  MedicalWebPage: { required: ['name'], allowed: [...THING, ...CREATIVE_WORK, 'lastReviewed', 'reviewedBy', 'medicalAudience'] },
};

/** Enumeration-valued properties and their schema.org members. */
const ENUMS: Record<string, string[]> = {
  prescriptionStatus: ['https://schema.org/PrescriptionOnly', 'https://schema.org/OTC'],
  availability: [
    'https://schema.org/InStock', 'https://schema.org/OutOfStock', 'https://schema.org/LimitedAvailability',
    'https://schema.org/PreOrder', 'https://schema.org/BackOrder', 'https://schema.org/Discontinued',
    'https://schema.org/InStoreOnly', 'https://schema.org/OnlineOnly', 'https://schema.org/SoldOut',
  ],
  procedureType: ['https://schema.org/NoninvasiveProcedure', 'https://schema.org/PercutaneousProcedure', 'https://schema.org/SurgicalProcedure'],
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

function typesOf(node: Record<string, unknown>): string[] {
  const t = node['@type'];
  return Array.isArray(t) ? t.map(String) : t === undefined ? [] : [String(t)];
}

function validateNode(node: Record<string, unknown>, path: string, errors: string[]): void {
  const types = typesOf(node);
  if (types.length) {
    const specs = types.map((t) => SCHEMA_SPECS[t]);
    types.forEach((t, i) => { if (!specs[i]) errors.push(`${path}: unknown @type "${t}"`); });
    const known = specs.filter((s): s is Spec => !!s);
    if (known.length === types.length) {
      const allowed = new Set(known.flatMap((s) => s.allowed));
      for (const key of Object.keys(node)) {
        if (node[key] !== undefined && !allowed.has(key)) errors.push(`${path}: property "${key}" is not defined for ${types.join('/')}`);
      }
      for (const req of new Set(known.flatMap((s) => s.required))) {
        if (isEmpty(node[req])) errors.push(`${path}: ${types.join('/')} requires "${req}"`);
      }
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (ENUMS[key] && value !== undefined && !ENUMS[key].includes(String(value))) {
      errors.push(`${path}.${key}: "${String(value)}" is not a schema.org enumeration member`);
    }
    const children = Array.isArray(value) ? value : [value];
    children.forEach((child, i) => {
      if (isRecord(child)) validateNode(child, Array.isArray(value) ? `${path}.${key}[${i}]` : `${path}.${key}`, errors);
    });
  }
}

/** Returns the list of problems; an empty list means the JSON-LD is valid. */
export function validateJsonLd(data: unknown): string[] {
  const errors: string[] = [];
  const roots = Array.isArray(data) ? data : [data];
  roots.forEach((root, i) => {
    if (!isRecord(root)) { errors.push(`[${i}]: not an object`); return; }
    if (root['@context'] !== 'https://schema.org') errors.push(`[${i}]: @context must be https://schema.org`);
    if (!typesOf(root).length) errors.push(`[${i}]: missing @type`);
    validateNode(root, `[${i}]`, errors);
  });
  return errors;
}

/** Extracts every application/ld+json payload from rendered HTML. */
export function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const parsed: unknown = JSON.parse(m[1]);
    if (Array.isArray(parsed)) out.push(...parsed);
    else out.push(parsed);
  }
  return out;
}
