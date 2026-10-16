/**
 * D-29 (owner decision 29): one search document per catalogue item or provider, built from MongoDB (the
 * source of truth). Pure functions, shared by the MongoDB fallback and the Meilisearch adapter.
 */
import { createHash } from 'crypto';
import { normalizeSearchText, MULTILINGUAL_SYNONYM_MAP } from '../seo-search/seo-search.module';

export const SEARCH_LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;
export type SearchLocale = (typeof SEARCH_LOCALES)[number];

export const SEARCH_SECTIONS = ['pharmacy', 'consultations', 'labs', 'nursing'] as const;
export type SearchSection = (typeof SEARCH_SECTIONS)[number];

export type SearchType = 'medicine' | 'doctor' | 'specialty' | 'lab_test' | 'lab_package' | 'radiology' | 'nursing' | 'article';

/** Home groups follow this order. Health articles are found from home only (no section owns them). */
export const SEARCH_TYPES: SearchType[] = ['medicine', 'doctor', 'specialty', 'lab_test', 'lab_package', 'radiology', 'nursing', 'article'];

export const SECTION_TYPES: Record<SearchSection, SearchType[]> = {
  pharmacy: ['medicine'],
  consultations: ['doctor', 'specialty'],
  labs: ['lab_test', 'lab_package', 'radiology'],
  nursing: ['nursing'],
};

const TYPE_SECTION: Record<SearchType, SearchSection | null> = {
  medicine: 'pharmacy', doctor: 'consultations', specialty: 'consultations',
  lab_test: 'labs', lab_package: 'labs', radiology: 'labs', nursing: 'nursing', article: null,
};

/** The source collections the index is built from (and watched for changes). */
export const SEARCH_SOURCES = ['medicines', 'provider_profiles', 'specialties', 'lab_services', 'radiology_services', 'nursing_services', 'articles'] as const;
export type SearchSource = (typeof SEARCH_SOURCES)[number];

export interface SearchDocument {
  /** Stable key: type + hash of the item id (Meilisearch primary keys allow only [A-Za-z0-9_-]). */
  key: string;
  /** `<collection>:<_id>`, so a delete event (which carries only the _id) finds the document. */
  src: string;
  id: string;
  type: SearchType;
  section: SearchSection | null;
  names: Partial<Record<SearchLocale, string>>;
  /** Normalised names, codes, ingredients and synonym variants, one string, for matching. */
  text: string;
  /** Normalised names only (ranking: a name match beats a match on an ingredient or synonym). */
  name_text: string;
  slug?: string | null;
  price?: number | null;
  specialty?: string | null;
  code?: string | null;
  requires_prescription: boolean;
  /** Decision 11: a medicine sold online only (the result row says so). */
  online_exclusive: boolean;
  /**
   * Popularity used for ranking. Always 0 for prescription-only items: decision 29 says they are never
   * promoted or boosted, so neither popularity nor sponsorship can lift them.
   */
  boost: number;
}

/** Only active, approved items and providers. Same rules as the patient lists of each section. */
export function sourceFilter(source: SearchSource): Record<string, unknown> {
  const governed = { is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' };
  switch (source) {
    // 439: the site's own search shows every medicine approved for publication, as the pharmacy list does;
    // indexing_eligibility is for search engines (sitemaps, IndexNow), not for the people on the site.
    case 'medicines': return { ...governed, active: { $ne: false } };
    case 'provider_profiles': return { type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', is_deleted: { $ne: true } };
    case 'specialties': return { active: { $ne: false }, is_deleted: { $ne: true } };
    case 'lab_services':
    case 'radiology_services':
    case 'nursing_services': return { ...governed, active: true };
    case 'articles': return { status: 'PUBLISHED', is_deleted: { $ne: true } };
  }
}

/** Mirrors `sourceFilter` for one document already read (a change event). */
export function isVisible(source: SearchSource, raw: any): boolean {
  if (!raw || raw.is_deleted === true) return false;
  const approved = raw.public_eligibility === true && raw.medical_review_status === 'approved';
  switch (source) {
    case 'medicines': return approved && raw.active !== false;
    case 'provider_profiles': return raw.type === 'doctor' && raw.status === 'active' && approved;
    case 'specialties': return raw.active !== false;
    case 'lab_services': return approved && raw.active === true && !isImaging(raw);
    case 'radiology_services':
    case 'nursing_services': return approved && raw.active === true;
    case 'articles': return raw.status === 'PUBLISHED';
  }
}

/** Imaging rows stored with the lab tests belong to radiology (same rule as the labs list). */
function isImaging(raw: any): boolean {
  return raw?.category === 'imaging' || raw?.sample_type === 'imaging';
}

function typeOf(source: SearchSource, raw: any): SearchType {
  switch (source) {
    case 'medicines': return 'medicine';
    case 'provider_profiles': return 'doctor';
    case 'specialties': return 'specialty';
    case 'lab_services': return raw?.is_package === true ? 'lab_package' : 'lab_test';
    case 'radiology_services': return 'radiology';
    case 'nursing_services': return 'nursing';
    case 'articles': return 'article';
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Names in every locale the record stores. Filipino is stored as `tl` (some rows use `fil`). */
export function localeNames(raw: any): Partial<Record<SearchLocale, string>> {
  const t = raw?.translations || {};
  const names: Partial<Record<SearchLocale, string>> = {
    ar: str(raw?.name_ar) || str(raw?.display_name_ar) || str(raw?.title_ar),
    en: str(raw?.name_en) || str(raw?.display_name_en) || str(raw?.title_en),
    ur: str(t.ur?.name) || str(t.ur?.title),
    hi: str(t.hi?.name) || str(t.hi?.title),
    bn: str(t.bn?.name) || str(t.bn?.title),
    fil: str(t.tl?.name) || str(t.fil?.name) || str(t.tl?.title) || str(t.fil?.title),
  };
  for (const l of SEARCH_LOCALES) if (!names[l]) delete names[l];
  return names;
}

/** Synonym variants (brand ↔ ingredient, Arabic ↔ English, other locales) that apply to these words. */
export function synonymVariants(words: string[]): string[] {
  const norm = words.map(normalizeSearchText).filter(Boolean);
  const out = new Set<string>();
  for (const entry of MULTILINGUAL_SYNONYM_MAP) {
    const variants = entry.variants.map(normalizeSearchText).filter(Boolean);
    if (variants.some((v) => norm.some((w) => w === v || ` ${w} `.includes(` ${v} `)))) for (const v of variants) out.add(v);
  }
  return [...out];
}

export function searchKey(type: SearchType, id: string): string {
  return `${type}-${createHash('sha1').update(String(id)).digest('hex').slice(0, 24)}`;
}

/** The search document for a source record, or null when it must not be searchable. */
export function toSearchDocument(source: SearchSource, raw: any): SearchDocument | null {
  if (!isVisible(source, raw)) return null;
  const id = str(raw?.id) || (raw?._id != null ? String(raw._id) : '');
  if (!id) return null;
  const type = typeOf(source, raw);
  const names = localeNames(raw);
  if (!Object.keys(names).length) return null;
  const t = raw?.translations || {};
  const extra: string[] = [
    raw?.active_ingredient, raw?.generic_name, raw?.short_code, raw?.code, raw?.body_part, raw?.modality, raw?.specialty,
    ...['ur', 'hi', 'bn', 'tl', 'fil'].flatMap((l) => [t[l]?.active_ingredient, ...(Array.isArray(t[l]?.search_aliases) ? t[l].search_aliases : [t[l]?.search_aliases])]),
    ...(Array.isArray(raw?.search_aliases) ? raw.search_aliases : []),
    ...(Array.isArray(raw?.tags) ? raw.tags : []),
  ].map(str).filter(Boolean);
  const nameList = Object.values(names) as string[];
  const synonyms = synonymVariants([...nameList, ...extra]);
  const name_text = nameList.map(normalizeSearchText).join(' | ');
  const text = [name_text, ...extra.map(normalizeSearchText), ...synonyms].filter(Boolean).join(' | ');
  const rx = raw?.requires_prescription === true;
  const popularity = Number(raw?.usage_count ?? raw?.popularity ?? raw?.rating_count ?? 0);
  const price = Number(raw?.price ?? raw?.price_clinic);
  return {
    key: searchKey(type, id),
    src: `${source}:${String(raw?._id ?? id)}`,
    id,
    type,
    section: TYPE_SECTION[type],
    names,
    text,
    name_text,
    slug: str(raw?.slug) || null,
    price: Number.isFinite(price) && price > 0 ? price : null,
    specialty: str(raw?.specialty) || null,
    code: str(raw?.code) || str(raw?.short_code) || null,
    requires_prescription: rx,
    online_exclusive: raw?.online_exclusive === true,
    boost: rx || !Number.isFinite(popularity) || popularity <= 0 ? 0 : Math.log10(1 + popularity),
  };
}

/** The name shown for a locale, and which locale it came from (a missing translation is not hidden). */
export function displayName(doc: Pick<SearchDocument, 'names'>, locale: SearchLocale): { name: string; name_locale: SearchLocale } {
  for (const l of [locale, 'en', 'ar', ...SEARCH_LOCALES] as SearchLocale[]) {
    const n = doc.names[l];
    if (n) return { name: n, name_locale: l };
  }
  return { name: '', name_locale: locale };
}

/** Text relevance of a document for a normalised query: name match first, then any other match. */
export function textScore(doc: Pick<SearchDocument, 'name_text' | 'text'>, terms: string[]): number {
  let best = 0;
  const names = doc.name_text.split(' | ');
  for (const term of terms) {
    if (!term) continue;
    if (names.some((n) => n === term)) best = Math.max(best, 100);
    else if (names.some((n) => n.startsWith(term))) best = Math.max(best, 80);
    else if (names.some((n) => ` ${n}`.includes(` ${term}`))) best = Math.max(best, 60);
    else if (names.some((n) => n.includes(term))) best = Math.max(best, 40);
    else if (` ${doc.text}`.includes(` ${term}`)) best = Math.max(best, 30);
    else if (doc.text.includes(term)) best = Math.max(best, 10);
  }
  return best;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Typo-tolerant pattern: the query's letters in order inside one word (one missing or doubled letter). */
export function tolerantPattern(term: string): string {
  return [...term.replace(/\s+/g, '')].map(escapeRegex).join('[^ |]{0,2}?');
}
