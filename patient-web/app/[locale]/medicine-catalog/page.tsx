import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseMedicineSearch } from "@/lib/api/medicines";
import { patientApiUrl } from "@/lib/api/upstream";
import { cdnImage, cleanProductName } from "@/lib/api/public-products-server";
import { JsonLd } from "@/components-next/json-ld";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { RetryErrorState } from "@/components-next/core/core-states";
import { CatalogSearch } from "@/components-next/pharmacy/catalog-search";
import { ProductGrid } from "@/components-next/pharmacy/product-grid";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { LandingEmpty, LandingPage } from "@/components-next/landing/landing-kit";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import pharmacy from "@/components-next/pharmacy/pharmacy.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

type SearchItem = {
  sku: number | null; id: string; slug: string; name: string | null; official_name?: string | null;
  form: string | null; strength: string | null; package_size: string | null;
  active_ingredient: string | null; price: number; currency: string; is_rx: boolean;
  image?: string | null; images?: string[];
};

async function searchPublicProducts(locale: string, q: string | undefined, page: number) {
  try {
    const params = new URLSearchParams({ locale, page: String(page), limit: "24" });
    if (q) params.set("q", q);
    const res = await fetch(patientApiUrl(`/public/products/search?${params.toString()}`), {
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 },
    } as RequestInit);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const items = (Array.isArray(data?.items) ? data.items : []).map((it: any) => ({
      ...it,
      name: cleanProductName(it.name, it.official_name),
      image: cdnImage(it.image) || (Array.isArray(it.images) && it.images[0] ? cdnImage(it.images[0]) : null),
    })) as SearchItem[];
    return { items, total: Number(data?.total || 0) };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "PublicMedicines" });
  const search = parseMedicineSearch(await searchParams);
  const canonical = localizedUrl(locale, "/medicine-catalog");
  const title = t("title");
  const description = t("body");
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((supportedLocale) => [supportedLocale, localizedUrl(supportedLocale, "/medicine-catalog")])),
        "x-default": localizedUrl("ar", "/medicine-catalog"),
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
    },
    robots: search.q || search.page > 1 ? { index: false, follow: true } : { index: true, follow: true },
  };
}

const PHARMACY = SERVICE_ICONS.pharmacy;
const PAGE_SIZE = 24;

export default async function PublicMedicineCatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  setRequestLocale(locale);
  const t = await getTranslations("PublicMedicines");
  const landing = await getTranslations("PublicLanding");
  const browse = await getTranslations("PharmacyBrowse");
  const search = parseMedicineSearch(await searchParams);
  const result = await searchPublicProducts(locale, search.q, search.page);
  if (!result) {
    return (
      <LandingPage locale={locale} title={t("title")}>
        <div className={pharmacy.state} role="alert"><RetryErrorState title={t("unavailableTitle")} body={t("unavailable")} retryLabel={(await getTranslations("RouteState"))("retry")} /></div>
      </LandingPage>
    );
  }
  const medicines = result.items;
  const canonical = localizedUrl(locale, "/medicine-catalog");
  const itemList = medicines.map((medicine, index) => ({ "@type": "ListItem", position: index + 1, url: localizedUrl(locale, `/p/${encodeURIComponent(medicine.slug)}`), name: medicine.name || t("untitled") }));
  const pages = Math.ceil(result.total / PAGE_SIZE);
  const qParam = search.q ? `&q=${encodeURIComponent(search.q)}` : "";

  return (
    <LandingPage locale={locale} title={t("title")} intro={t("body")}>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "ItemList", itemListElement: itemList } }} />
      <ButtonLink href={`/${locale}/pharmacy/interactions`} label={landing("catalog.interactions")} variant="outline" size="md" />
      <div className={pharmacy.searchWrap}>
        <CatalogSearch locale={locale} target="medicine-catalog" initial={search.q ?? ""} tools={false} />
      </div>
      {medicines.length === 0 ? (
        <LandingEmpty icon={PHARMACY.icon} tone={PHARMACY.tone} title={t("empty")} />
      ) : (
        <>
          <ProductGrid
            locale={locale}
            priorityCount={2}
            items={medicines.map((medicine) => ({
              id: medicine.id,
              slug: medicine.slug,
              name: medicine.name || t("untitled"),
              price: medicine.price || 0,
              oldPrice: null,
              image: medicine.image ?? null,
              form: medicine.form,
              strength: medicine.strength,
              packageSize: medicine.package_size,
              rx: medicine.is_rx === true,
            }))}
          />
          {pages > 1 ? (
            <nav className={pharmacy.pager} aria-label={browse("pagination")}>
              {search.page > 1 ? (
                <Link rel="prev" href={`/${locale}/medicine-catalog?page=${search.page - 1}${qParam}`} className={`nabd-button nabd-button--outline nabd-button--md ${pharmacy.linkButton}`}>
                  <span className="nabd-button__label">{browse("previous")}</span>
                </Link>
              ) : null}
              <span className={pharmacy.pagerInfo}>{browse("pageOf", { page: search.page, pages })}</span>
              {search.page < pages ? (
                <Link rel="next" href={`/${locale}/medicine-catalog?page=${search.page + 1}${qParam}`} className={`nabd-button nabd-button--outline nabd-button--md ${pharmacy.linkButton}`}>
                  <span className="nabd-button__label">{browse("next")}</span>
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </LandingPage>
  );
}
