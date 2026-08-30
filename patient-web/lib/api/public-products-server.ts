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
  form: string | null;
  strength: string | null;
  package_size: string | null;
  price: number;
  old_price: number | null;
  currency: string;
  is_rx: boolean;
  available: boolean;
  image: string | null;
};

const CDN = (process.env.NEXT_PUBLIC_CDN_BASE_URL || "https://cdn.nabd.plus").replace(/\/$/, "");
export function cdnImage(u?: string | null) {
  if (!u) return null;
  return u.startsWith("http") ? u : `${CDN}/${u.replace(/^\//, "")}`;
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
  return getJson<PublicProduct>(`/public/product/${locale}/${encodeURIComponent(decoded)}`);
}

export type CategoryTree = { locale: string; categories: Array<{ name: string; count: number; subs: Record<string, number> }> };

export async function getPublicCategories(locale: Locale): Promise<CategoryTree | null> {
  if (!isLocale(locale)) return null;
  return getJson<CategoryTree>(`/public/categories/${locale}`);
}

export type CategoryItems = {
  locale: string; category: string; sub_category: string | null;
  page: number; limit: number; total: number; items: PublicProductCard[];
};

export async function getPublicCategoryProducts(locale: Locale, category: string, sub: string | undefined, page: number): Promise<CategoryItems | null> {
  if (!isLocale(locale) || !category.trim()) return null;
  const params = new URLSearchParams({ category, page: String(page) });
  if (sub) params.set("sub", sub);
  return getJson<CategoryItems>(`/public/categories/${locale}/items?${params.toString()}`);
}

export type ProductSitemapPage = { locale: string; page: number; per_page: number; total: number; pages: number; urls: Array<{ slug: string; lastmod?: string }> };

export async function getProductSitemap(locale: string, page: number): Promise<ProductSitemapPage | null> {
  if (!isLocale(locale) || !Number.isInteger(page) || page < 1 || page > 1000) return null;
  return getJson<ProductSitemapPage>(`/public/sitemaps/products/${locale}/${page}`, 21600);
}
