import { patientApiUrl } from "@/lib/api/upstream";
import { isLocale, type Locale } from "@/lib/i18n";

const slugSchema = /^[\p{L}\p{N}_-]{1,180}$/u;

export type PublicProduct = {
  id: string;
  sku: number | null;
  locale: string;
  name: string | null;
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
  available_online: boolean;
  availability_status: string;
  available: boolean;
  country_of_origin: string | null;
  images: string[];
  image: string | null;
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
      next: { revalidate },
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

export async function getPublicCategoryProducts(
  locale: Locale,
  category: string | undefined,
  sub: string | undefined,
  page: number,
  q?: string
): Promise<CategoryItems | null> {
  return (await readPublicCategoryProducts(locale, category, sub, page, q)).data;
}

export async function readPublicCategoryProducts(
  locale: Locale,
  category: string | undefined,
  sub: string | undefined,
  page: number,
  q?: string
): Promise<PublicRead<CategoryItems>> {
  if (!isLocale(locale)) return { data: null, failed: false };
  const catParam = category && category.trim() ? category : "all";
  const params = new URLSearchParams({ category: catParam, page: String(page) });
  if (sub) params.set("sub", sub);
  if (q && q.trim()) params.set("q", q.trim());
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
      })),
    },
  };
}

/**
 * Products with the same active ingredient (the product page's "alternatives"): the public product search
 * (`GET /public/products/search`) by the ingredient, kept to exact matches of it, without the product itself.
 * Empty when the product has no active ingredient or the search is unavailable: the section is then hidden.
 */
export async function getPublicAlternatives(
  locale: Locale,
  product: { id: string; active_ingredient: string | null },
  max = 5,
): Promise<PublicProductCard[]> {
  const ingredient = (product.active_ingredient || "").trim();
  if (!isLocale(locale) || !ingredient) return [];
  const params = new URLSearchParams({ q: ingredient, locale, page: "1", limit: "12" });
  const data = await getJson<{ items?: PublicProductCard[] }>(`/public/products/search?${params.toString()}`);
  const wanted = ingredient.toLowerCase();
  return (data?.items || [])
    .filter((it) => it.id !== product.id && (it.active_ingredient || "").trim().toLowerCase() === wanted && it.price > 0)
    .slice(0, max)
    .map((it) => ({
      ...it,
      name: cleanProductName(it.name, it.official_name),
      image: resolveImageUri(it.image) || (Array.isArray(it.images) && it.images[0] ? resolveImageUri(it.images[0]) : null),
    }));
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
