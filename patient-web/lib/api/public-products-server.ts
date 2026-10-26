import { patientApiUrl } from "@/lib/api/upstream";
import { isLocale, type Locale } from "@/lib/i18n";
import { publicReadSignal } from "@/lib/api/public-timeout";

const slugSchema = /^[\p{L}\p{N}_-]{1,180}$/u;

export type PublicProduct = {
  id: string;
  sku: number | null;
  locale: string;
  name: string | null;
  /** Decision E (issue 1556): on ur, hi and bn the English name drawn under the localized one; null on ar, en and fil. */
  english_name?: string | null;
  official_name: string | null;
  slug: string;
  slugs: Record<string, string | null>;
  description: string | null;
  indications: string[];
  dosage_instructions: string | null;
  side_effects: string[];
  warnings: string[];
  storage_conditions: string | null;
  how_to_use: string[];
  package_content_details: string | null;
  brand_benefits: string | null;
  category: string | null;
  sub_category: string | null;
  sub_sub_category: string | null;
  form: string | null;
  strength: string | null;
  package_size: string | null;
  active_ingredient: string | null;
  manufacturer: string | null;
  barcode: string | null;
  price: number;
  old_price: number | null;
  discount_percent: number;
  has_discount: boolean;
  currency: string;
  is_rx: boolean;
  /** Decision 11: sold online only ("أونلاين فقط" badge); absent on answers from before the field was sent. */
  online_exclusive?: boolean;
  /** Approved for search engines (indexing_eligibility); a published item that is not stays on the site with noindex. */
  indexable?: boolean;
  available_online: boolean;
  availability_status: string;
  available: boolean;
  country_of_origin: string | null;
  /** issue 1819: the stored refrigeration flag; absent on answers from before the field was sent. */
  cold_chain?: boolean;
  /** issue 1819: the active ingredients recorded as interacting with this product; absent on older answers. */
  interactions?: string[];
  images: string[];
  image: string | null;
  /** Decision D (issue 1556): the product's variant group (powers, colours, shades), null when it has none. */
  variant_group?: string | null;
  variant?: PublicVariantAttr | null;
};

/** A record's own attribute inside its variant group (decision D). Colour and shade are words of the English name. */
export type PublicVariantAttr = {
  kind: "power" | "colour" | "colour_power" | "shade" | "picture" | string;
  power: number | null;
  colour: string | null;
  shade: string | null;
  position: number;
};

/** One variant of a product (GET /public/product-variants/:locale/:id): its own id, SKU, price and picture. */
export type PublicVariant = {
  id: string;
  sku: number | null;
  slug: string;
  name: string | null;
  price: number;
  old_price: number | null;
  currency: string;
  is_rx: boolean;
  online_exclusive: boolean;
  available: boolean;
  availability_status: string;
  image: string | null;
  variant: PublicVariantAttr;
};

export type PublicProductCard = {
  sku: number | null;
  id: string;
  slug: string;
  name: string | null;
  official_name?: string | null;
  form: string | null;
  strength: string | null;
  package_size: string | null;
  price: number;
  old_price: number | null;
  currency: string;
  is_rx: boolean;
  online_exclusive?: boolean;
  available: boolean;
  image: string | null;
  images?: string[];
  /** Only the search endpoint sends it (the category listing does not). */
  active_ingredient?: string | null;
};

const CDN = (process.env.NEXT_PUBLIC_CDN_BASE_URL || "https://cdn.nabd.plus").replace(/\/$/, "");

export function resolveImageUri(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;
  const u = input.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${CDN}/${u.replace(/^\//, "")}`;
}

export function cdnImage(u?: string | null) {
  return resolveImageUri(u);
}

export function resolveProductGallery(prod: any): string[] {
  if (!prod) return [];
  const raw: any[] = [
    ...(Array.isArray(prod.images) ? prod.images : []),
    prod.image_1,
    prod.image_2,
    prod.image_3,
    prod.image_4,
    prod.image_5,
    prod.image,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const u = resolveImageUri(r);
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/**
 * Clean product display name to prevent raw measurements like "400 جم" or "1600 جم"
 * when official_name or translations have the real brand name.
 */
export function cleanProductName(name?: string | null, officialName?: string | null): string {
  const n = (name || "").trim();
  const off = (officialName || "").trim();
  if (!n && !off) return "منتج";
  // If name is just a weight/package size like "400 جم" or "10 Pcs", prefer official_name
  if (/^(\d+\s*(جم|مل|جرام|قطعة|قرص|كبسولة|gm|ml|pcs|tablet|capsule))$/i.test(n) && off) {
    return off;
  }
  return off || n;
}

/** What a public read answered: the body (null when there is none) and whether the service FAILED (no answer, or a 5xx), as opposed to answering with nothing (a 404). */
export type PublicRead<T> = { data: T | null; failed: boolean };

async function readJson<T>(path: string, revalidate = 3600): Promise<PublicRead<T>> {
  try {
    const res = await fetch(patientApiUrl(path), {
      headers: { Accept: "application/json" },
      // 14.8: tagged so a catalogue change revalidates product pages at once (POST /api/revalidate).
      next: { revalidate, tags: ["medicines"] },
      signal: publicReadSignal(),
    } as RequestInit);
    if (res.status >= 500) return { data: null, failed: true };
    if (!res.ok) return { data: null, failed: false };
    return { data: (await res.json()) as T, failed: false };
  } catch {
    return { data: null, failed: true };
  }
}

async function getJson<T>(path: string, revalidate = 3600): Promise<T | null> {
  return (await readJson<T>(path, revalidate)).data;
}

function normalizeProduct(prod: PublicProduct): PublicProduct {
  return {
    ...prod,
    name: cleanProductName(prod.name, prod.official_name),
    images: resolveProductGallery(prod),
  };
}

export async function getPublicProduct(locale: Locale, slug: string): Promise<PublicProduct | null> {
  return (await readPublicProduct(locale, slug)).data;
}

/**
 * F82-3: the product page is cached (ISR), so it must tell "no such product" (404, a page) from "the service failed"
 * (it throws, and Next keeps the last good copy). The answer is the same for every visitor.
 */
export async function readPublicProduct(locale: Locale, slug: string): Promise<PublicRead<PublicProduct>> {
  let decoded: string;
  try { decoded = decodeURIComponent(slug); } catch { return { data: null, failed: false }; }
  if (!isLocale(locale) || !slugSchema.test(decoded)) return { data: null, failed: false };
  const read = await readJson<PublicProduct>(`/public/product/${locale}/${encodeURIComponent(decoded)}`);
  return { data: read.data ? normalizeProduct(read.data) : null, failed: read.failed };
}

export type CategoryTree = {
  locale: string;
  categories: Array<{ name: string; count: number; subs: Record<string, number> }>;
};

export async function getPublicCategories(locale: Locale): Promise<CategoryTree | null> {
  return (await readPublicCategories(locale)).data;
}

export async function readPublicCategories(locale: Locale): Promise<PublicRead<CategoryTree>> {
  if (!isLocale(locale)) return { data: null, failed: false };
  return readJson<CategoryTree>(`/public/categories/${locale}`);
}

export type CategoryItems = {
  locale: string;
  category: string;
  sub_category: string | null;
  page: number;
  limit: number;
  total: number;
  items: PublicProductCard[];
};

/**
 * issue 1819: the category listing's extra filters, as the app's filter sheet has them (dosage form, maker, prescription
 * or not, price range). Every field is optional; whatever is empty is left out of the request.
 */
export type CatalogueFilters = { form?: string; brand?: string; rx?: "true" | "false"; price_min?: string; price_max?: string };

/** The filters of a URL's query, trimmed, bounded and with an unparseable price dropped (the server validates again). */
export function parseCatalogueFilters(raw: { form?: string; brand?: string; rx?: string; price_min?: string; price_max?: string }): CatalogueFilters {
  const text = (v?: string) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim().slice(0, 80) : "");
  const money = (v?: string) => {
    const t = typeof v === "string" ? v.trim() : "";
    const n = t === "" ? NaN : Number(t);
    return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? String(n) : "";
  };
  const out: CatalogueFilters = {};
  if (text(raw.form)) out.form = text(raw.form);
  if (text(raw.brand)) out.brand = text(raw.brand);
  if (raw.rx === "true" || raw.rx === "false") out.rx = raw.rx;
  const min = money(raw.price_min);
  const max = money(raw.price_max);
  if (min) out.price_min = min;
  if (max && (!min || Number(max) >= Number(min))) out.price_max = max;
  return out;
}

export async function getPublicCategoryProducts(
  locale: Locale,
  category: string | undefined,
  sub: string | undefined,
  page: number,
  q?: string,
  sort?: "popular" | "price_asc" | "price_desc" | "newest",
  filters?: CatalogueFilters
): Promise<CategoryItems | null> {
  return (await readPublicCategoryProducts(locale, category, sub, page, q, sort, filters)).data;
}

/** The dosage forms and makers of the public catalogue (GET /medicines/filters, public): the choices of the filter panel. */
export async function readCatalogueFilterOptions(): Promise<{ forms: string[]; brands: string[] }> {
  const read = await readJson<{ forms?: unknown; brands?: unknown }>("/medicines/filters");
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : []);
  return { forms: list(read.data?.forms), brands: list(read.data?.brands) };
}

export async function readPublicCategoryProducts(
  locale: Locale,
  category: string | undefined,
  sub: string | undefined,
  page: number,
  q?: string,
  sort?: "popular" | "price_asc" | "price_desc" | "newest",
  filters?: CatalogueFilters
): Promise<PublicRead<CategoryItems>> {
  if (!isLocale(locale)) return { data: null, failed: false };
  const catParam = category && category.trim() ? category : "all";
  const params = new URLSearchParams({ category: catParam, page: String(page) });
  if (sub) params.set("sub", sub);
  if (q && q.trim()) params.set("q", q.trim());
  // #816: the catalogue order; the default (popularity) is left out so the static page and its cache key stay the same
  if (sort && sort !== "popular") params.set("sort", sort);
  // issue 1819: the extra filters (the server validates them again); nothing is sent for an empty one
  for (const [key, value] of Object.entries(filters ?? {})) if (value) params.set(key, value);
  const read = await readJson<CategoryItems>(`/public/categories/${locale}/items?${params.toString()}`);
  const data = read.data;
  if (!data) return { data: null, failed: read.failed };
  return {
    failed: false,
    data: {
      ...data,
      items: (data.items || []).map((it) => ({
        ...it,
        name: cleanProductName(it.name, it.official_name),
        image: resolveImageUri(it.image) || (Array.isArray(it.images) && it.images[0] ? resolveImageUri(it.images[0]) : null),
        images: Array.isArray(it.images) ? it.images.map((src) => resolveImageUri(src)).filter((src): src is string => Boolean(src)) : undefined,
      })),
    },
  };
}

/** What the product page shows under the product (issue 1547): equivalents, or similar products when there are none. */
export type PublicEquivalents = { equivalents: PublicProductCard[]; similar: PublicProductCard[] };

const toCard = (it: PublicProductCard): PublicProductCard => ({
  ...it,
  name: cleanProductName(it.name, it.official_name),
  image: resolveImageUri(it.image) || (Array.isArray(it.images) && it.images[0] ? resolveImageUri(it.images[0]) : null),
});

/** Decision D (issue 1556): the variants of a product for the picker; none when it has no group or the read fails. */
export async function getPublicVariants(locale: Locale, product: { id: string; variant_group?: string | null }): Promise<PublicVariant[]> {
  if (!isLocale(locale) || !product.variant_group) return [];
  const data = await getJson<{ variants?: PublicVariant[] }>(`/public/product-variants/${locale}/${encodeURIComponent(product.id)}`);
  return Array.isArray(data?.variants) ? data.variants.filter((v) => v && v.id && v.variant) : [];
}

/**
 * The product's equivalents (`GET /public/product-equivalents/{locale}/{id}`): the published products with the same
 * NORMALIZED active ingredient, the same strength first; and, only when there is none, `similar` products of the same
 * therapeutic class / category. Both empty when the read fails or there is nothing: the page then draws no section.
 */
export async function getPublicEquivalents(locale: Locale, productId: string): Promise<PublicEquivalents> {
  if (!isLocale(locale) || !productId) return { equivalents: [], similar: [] };
  const data = await getJson<Partial<PublicEquivalents>>(`/public/product-equivalents/${locale}/${encodeURIComponent(productId)}`);
  return {
    equivalents: (data?.equivalents || []).filter((it) => it.id !== productId).map(toCard),
    similar: (data?.similar || []).filter((it) => it.id !== productId).map(toCard),
  };
}

export type ProductSitemapPage = {
  locale: string;
  page: number;
  per_page: number;
  total: number;
  pages: number;
  /** alternates: each locale's own slug for the same product (hreflang must use canonical URLs). */
  urls: Array<{ slug: string; alternates?: Partial<Record<string, string>>; lastmod?: string }>;
};

export async function getProductSitemap(locale: string, page: number): Promise<ProductSitemapPage | null> {
  if (!isLocale(locale) || !Number.isInteger(page) || page < 1 || page > 1000) return null;
  return getJson<ProductSitemapPage>(`/public/sitemaps/products/${locale}/${page}`, 21600);
}
