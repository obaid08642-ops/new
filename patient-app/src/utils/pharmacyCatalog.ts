import { pickDbField } from './localize';
import { resolveGallery } from './imageUrl';

/**
 * What the pharmacy hub, the product page, the wishlist and the comparison read from a medicine row
 * (backend `schemas/medicine.schema.ts`, answered by GET /medicines, /medicines/:id/details, /medicines/compare and
 * /users/me/wishlist). Every field is optional: a row that lacks one simply does not draw that part.
 */
export interface Med {
  id: string;
  slug?: string | null;
  name?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  translations?: Record<string, Record<string, unknown>>;
  price?: number | null;
  old_price?: number | null;
  discount_percent?: number;
  image?: string | null;
  images?: string[];
  manufacturer?: string | null;
  package_size?: string | null;
  requires_prescription?: boolean;
  rx?: boolean;
  category?: string | null;
  sub_category?: string | null;
  form?: string | null;
  strength?: string | null;
  active_ingredient?: string | null;
  generic_name?: string | null;
  available?: boolean;
  [more: string]: unknown;
}

/** The hub's category chips: the id the filter screen sends, the key of the label, and the catalogue's own category name (data, not text). */
export const PHARMACY_CATEGORIES = [
  { id: 'all', labelKey: 'pharmacy.all', dbName: 'all' },
  { id: 'medications', labelKey: 'pharmacy.cat.medications', dbName: 'الأدوية والعلاج' },
  { id: 'hair-care', labelKey: 'pharmacy.cat.hairCare', dbName: 'العناية بالشعر' },
  { id: 'cosmetics', labelKey: 'pharmacy.cat.cosmetics', dbName: 'المكياج والإكسسوارات' },
  { id: 'skincare', labelKey: 'pharmacy.cat.skincare', dbName: 'العناية بالبشرة' },
  { id: 'baby', labelKey: 'pharmacy.cat.baby', dbName: 'الأم والطفل' },
  { id: 'vitamins', labelKey: 'pharmacy.cat.vitamins', dbName: 'الفيتامينات والتغذية الصحية' },
  { id: 'personal-care', labelKey: 'pharmacy.cat.personalCare', dbName: 'العناية الشخصية' },
] as const;

/** The name to show, in the app's language (the catalogue's six-language fields, then English, then Arabic). */
export const medName = (m: Med): string => (pickDbField<string>(m, 'name') || m.name_en || m.name_ar || m.name || '') as string;

/**
 * A catalogue field in the app's language: the six-language columns (`*_ar`, `*_en`, translations) first, then the plain
 * column of the same name (active ingredient, form, strength and category are stored without a language suffix).
 */
export function medField<T = unknown>(m: Med, base: string): T | undefined {
  const localized = pickDbField<T>(m, base);
  return (localized ?? (m[base] as T | undefined)) || undefined;
}

/** The price when the API sent a real one; a missing or zero price is not drawn (never a made-up 0.00). */
export function medPrice(m: Med): number | null {
  const p = Number(m.price);
  return Number.isFinite(p) && p > 0 ? p : null;
}

/** Percent off, from the API's own figure or from `old_price` over `price`; 0 when there is no real discount. */
export function discountPercent(m: Med): number {
  const given = Number(m.discount_percent);
  if (Number.isFinite(given) && given > 0) return Math.round(given);
  const price = medPrice(m);
  const old = Number(m.old_price);
  return price && Number.isFinite(old) && old > price ? Math.round((1 - price / old) * 100) : 0;
}

export const needsRx = (m: Med): boolean => Boolean(m.requires_prescription || m.rx);

/** "Company · pack", each part only when the API has it. */
export const medMeta = (m: Med): string => [m.manufacturer, m.package_size].filter((x): x is string => typeof x === 'string' && x.trim().length > 0).join(' · ');

export const medGallery = (m: Med): string[] => resolveGallery(m);

/** The filters the filter screen hands to the hub (route params, all strings). */
export interface HubFilters {
  category?: string;
  forms?: string;
  brands?: string;
  rx?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

/** How many filters are on: the category, each form, each brand, "prescription only" and the price range. */
export function countFilters(f: HubFilters): number {
  const list = (v?: string) => (v ? v.split(',').filter(Boolean).length : 0);
  return (f.category && f.category !== 'all' ? 1 : 0) + list(f.forms) + list(f.brands) + (f.rx === '1' ? 1 : 0) + (f.minPrice || f.maxPrice ? 1 : 0);
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  medications: ['أدوية وعلاجات', 'medications', 'أدوية ومسكنات'],
  'hair-care': ['عناية بالشعر', 'hair-care'],
  cosmetics: ['مكياج وإكسسوارات', 'cosmetics'],
  skincare: ['العناية بالبشرة', 'skincare'],
  baby: ['الأم والطفل', 'عناية بالطفل', 'baby'],
  vitamins: ['فيتامينات ومكملات', 'فيتامينات', 'vitamins'],
  'personal-care': ['عناية شخصية', 'personal-care'],
};

/**
 * The hub's own pass over what the server returned (unchanged from the screen it replaces): category, search words,
 * "prescription only", price range, forms, brands and the sort the filter screen asked for.
 */
export function filterMeds(rows: Med[], q: { activeCat: string; search: string; filters: HubFilters }): Med[] {
  const { activeCat, search, filters } = q;
  const cat = filters.category || activeCat;
  const needle = search.toLowerCase();
  return rows
    .filter((m) => {
      const matchCat =
        cat === 'all' || m.cat === cat || m.slug === cat || m.category === cat || (CATEGORY_ALIASES[cat] ?? []).includes(String(m.category));
      const matchSearch =
        !search ||
        String(m.name ?? '').toLowerCase().includes(needle) ||
        String(m.name_ar ?? '').includes(search) ||
        String(m.activeIngredient ?? '').toLowerCase().includes(needle);
      const matchRx = filters.rx === '1' ? needsRx(m) : true;
      const price = Number(m.price ?? m.p ?? 0);
      const matchMin = filters.minPrice ? price >= parseFloat(filters.minPrice) : true;
      const matchMax = filters.maxPrice ? price <= parseFloat(filters.maxPrice) : true;
      const forms = filters.forms ? filters.forms.split(',') : [];
      const matchForms = forms.length
        ? forms.some((f) => String(m.form ?? '').includes(f) || String(m.name ?? '').includes(f) || String(m.name_ar ?? '').includes(f)) || !m.form
        : true;
      const brands = filters.brands ? filters.brands.split(',') : [];
      const matchBrands = brands.length
        ? brands.some((b) => String(m.brand ?? '').includes(b) || String(m.manufacturer ?? '').includes(b) || String(m.name_ar ?? '').includes(b)) || (!m.brand && !m.manufacturer)
        : true;
      return matchCat && matchSearch && matchRx && matchMin && matchMax && matchForms && matchBrands;
    })
    .sort((a, b) => {
      const pa = Number(a.price ?? a.p ?? 0);
      const pb = Number(b.price ?? b.p ?? 0);
      if (filters.sort === 'price_asc') return pa - pb;
      if (filters.sort === 'price_desc') return pb - pa;
      if (filters.sort === 'newest') return b.id > a.id ? 1 : -1;
      return 0;
    });
}

/** The query string the hub sends to GET /medicines for its search, category and filters. */
export function listQuery(search: string, activeCat: string, f: HubFilters): string {
  const q = new URLSearchParams();
  if (search) q.append('search', search);
  const cat = f.category || activeCat;
  const target = PHARMACY_CATEGORIES.find((c) => c.id === cat)?.dbName || cat;
  if (target && target !== 'all') q.append('category', target);
  if (f.forms) q.append('forms', f.forms);
  if (f.brands) q.append('brands', f.brands);
  if (f.rx === '1') q.append('rx_only', '1');
  if (f.minPrice) q.append('min_price', f.minPrice);
  if (f.maxPrice) q.append('max_price', f.maxPrice);
  if (f.sort) q.append('sort', f.sort);
  return q.toString();
}
