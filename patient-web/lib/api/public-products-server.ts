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

async function getJson<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const res = await fetch(patientApiUrl(path), {
      headers: { Accept: "application/json" },
      next: { revalidate },
    } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getPublicProduct(locale: Locale, slug: string): Promise<PublicProduct | null> {
  const decoded = decodeURIComponent(slug);
  if (!isLocale(locale) || !slugSchema.test(decoded)) return null;
  const prod = await getJson<PublicProduct>(`/public/product/${locale}/${encodeURIComponent(decoded)}`);
  if (!prod) return null;
  return {
    ...prod,
    name: cleanProductName(prod.name, prod.official_name),
    images: resolveProductGallery(prod),
  };
}

export type CategoryTree = {
  locale: string;
  categories: Array<{ name: string; count: number; subs: Record<string, number> }>;
};

export async function getPublicCategories(locale: Locale): Promise<CategoryTree | null> {
  if (!isLocale(locale)) return null;
  return getJson<CategoryTree>(`/public/categories/${locale}`);
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
  category: string,
  sub: string | undefined,
  page: number
): Promise<CategoryItems | null> {
  if (!isLocale(locale) || !category.trim()) return null;
  const params = new URLSearchParams({ category, page: String(page) });
  if (sub) params.set("sub", sub);
  const data = await getJson<CategoryItems>(`/public/categories/${locale}/items?${params.toString()}`);
  if (!data) return null;
  return {
    ...data,
    items: (data.items || []).map((it) => ({
      ...it,
      name: cleanProductName(it.name, it.official_name),
      image: resolveImageUri(it.image) || (Array.isArray(it.images) && it.images[0] ? resolveImageUri(it.images[0]) : null),
    })),
  };
}

export type ProductSitemapPage = {
  locale: string;
  page: number;
  per_page: number;
  total: number;
  pages: number;
  urls: Array<{ slug: string; lastmod?: string }>;
};

export async function getProductSitemap(locale: string, page: number): Promise<ProductSitemapPage | null> {
  if (!isLocale(locale) || !Number.isInteger(page) || page < 1 || page > 1000) return null;
  return getJson<ProductSitemapPage>(`/public/sitemaps/products/${locale}/${page}`, 21600);
}
