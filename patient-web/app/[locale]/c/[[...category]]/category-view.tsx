import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { readPublicCategories, readPublicCategoryProducts } from "@/lib/api/public-products-server";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { JsonLd } from "@/components-next/json-ld";
import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { CoreShell } from "@/components-next/core/core-shell";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { CatalogSearch } from "@/components-next/pharmacy/catalog-search";
import { ChipLink } from "@/components-next/pharmacy/chip-link";
import { ProductGrid } from "@/components-next/pharmacy/product-grid";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import styles from "@/components-next/pharmacy/pharmacy.module.css";

/**
 * F82-3: the category list is one view with two routes. The static/ISR page (no `searchParams`: page 1, no search) is the
 * one that is cached and shared; a request with `?page=` or `?q=` is answered by the dynamic twin under /q (proxy.ts,
 * lib/security/query-twin.ts), which passes `searchParams`. `searchParams` is undefined on the static route.
 */
export type CategoryViewProps = {
  params: Promise<{ locale: string; category?: string[] }>;
  searchParams?: Promise<{ page?: string; q?: string }>;
};
type Props = CategoryViewProps;

/** The window of the static page: the catalogue reads it is made of are cached for the same hour (lib/api/public-products-server.ts). */
export const CATEGORY_REVALIDATE_SECONDS = 3600;

function parsePage(raw?: string) {
  const n = Number(raw || "1");
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
}

export async function categoryMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "PharmacyBrowse" });
  const brand = (await getTranslations({ locale, namespace: "Shared" }))("brand");
  const decoded = (category || []).map((c) => decodeURIComponent(c));
  const page = parsePage((await searchParams)?.page);
  const name = decoded[decoded.length - 1];
  const path = `/c${decoded.length ? `/${decoded.map(encodeURIComponent).join("/")}` : ""}`;
  const canonical = localizedUrl(locale, path);
  const title = name ? name : t("allTitle");
  const description = `${title} — ${brand}`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((supportedLocale) => [supportedLocale, localizedUrl(supportedLocale, path)])),
        "x-default": localizedUrl("ar", path),
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
    },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export async function CategoryView({ params, searchParams }: Props) {
  const { locale, category } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  setRequestLocale(typedLocale);
  const t = await getTranslations("PharmacyBrowse");
    const decoded = (category || []).map((c) => decodeURIComponent(c));
  if (decoded.length > 2) notFound();
  const sParams = (await searchParams) ?? {};
  const page = parsePage(sParams.page);
  const q = (sParams.q || "").trim();
  const [main, sub] = decoded;

  const [treeRead, dataRead] = await Promise.all([
    readPublicCategories(typedLocale),
    readPublicCategoryProducts(typedLocale, main || "all", sub, page, q),
  ]);
  // A failed read (no answer, or a 5xx) is not an empty catalogue: this page is cached, and a cached "no products" or error
  // would replace the good copy. Throwing keeps it (stale-if-error, #302).
  if (treeRead.failed || dataRead.failed) throw new PublicDataUnavailableError("category");
  const tree = treeRead.data;
  const data = dataRead.data;

  const isAll = !main || main === "all" || main === "الكل";
  const heading = q ? t("resultsFor", { query: q }) : isAll ? t("allTitle") : (sub || main);
  const totalProducts = data?.total ?? 0;
  const pages = Math.max(Math.ceil(totalProducts / (data?.limit || 24)), 1);
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
  const basePath = isAll
    ? `/${locale}/c`
    : `/${locale}/c/${encodeURIComponent(main)}${sub ? `/${encodeURIComponent(sub)}` : ""}`;

  // The category rail is the API's own tree for this language (names and live counts), not a fixed list.
  const categories = tree?.categories || [];
  const activeCategory = isAll ? undefined : categories.find((c) => c.name === main);
  const subs = activeCategory ? Object.entries(activeCategory.subs).sort((a, b) => b[1] - a[1]) : [];

  const items = data?.items || [];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: heading,
      url: localizedUrl(locale, basePath.slice(`/${locale}`.length)),
      inLanguage: locale,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: totalProducts,
        itemListElement: items.slice(0, 24).map((it, i) => ({
          "@type": "ListItem",
          position: (page - 1) * (data?.limit || 24) + i + 1,
          url: localizedUrl(locale, `/p/${encodeURIComponent(it.slug)}`),
          name: it.name || undefined,
        })),
      },
    },
  ];

  const backHref = sub ? `/${locale}/c/${encodeURIComponent(main)}` : isAll ? `/${locale}/pharmacy` : `/${locale}/c`;

  let content: React.ReactNode;
  if (items.length === 0) {
    content = (
      <div className={styles.state}>
        <EmptyState icon="pill" tone={PHARMACY_TONE} title={t("emptyTitle")} body={t("emptyBody")} />
        {isAll && !q ? null : (
          <Link href={`/${locale}/c`} className={`nabd-button nabd-button--primary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
            <span className="nabd-button__label">{t("browseAll")}</span>
          </Link>
        )}
      </div>
    );
  } else {
    content = (
      <>
        <ProductGrid
          locale={locale}
          priorityCount={2}
          items={items.map((it) => ({
            id: it.id,
            slug: it.slug,
            name: it.name || it.slug,
            price: it.price || 0,
            oldPrice: it.old_price,
            image: it.image,
            form: it.form,
            strength: it.strength,
            packageSize: it.package_size,
            rx: it.is_rx,
          }))}
        />
        {pages > 1 ? (
          <nav className={styles.pager} aria-label={t("pagination")}>
            {page > 1 ? (
              <Link rel="prev" href={`${basePath}?page=${page - 1}${qParam}`} className={`nabd-button nabd-button--outline nabd-button--md ${styles.linkButton}`}>
                <span className="nabd-button__label">{t("previous")}</span>
              </Link>
            ) : null}
            <span className={styles.pagerInfo}>{t("pageOf", { page, pages })}</span>
            {page < pages ? (
              <Link rel="next" href={`${basePath}?page=${page + 1}${qParam}`} className={`nabd-button nabd-button--outline nabd-button--md ${styles.linkButton}`}>
                <span className="nabd-button__label">{t("next")}</span>
              </Link>
            ) : null}
          </nav>
        ) : null}
      </>
    );
  }

  return (
    <CoreShell locale={typedLocale} title={heading} backHref={backHref}>
      <StaleWhileRevalidate maxAgeSeconds={searchParams === undefined ? CATEGORY_REVALIDATE_SECONDS : undefined} />
      <JsonLd data={jsonLd} />
      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className={styles.title}>{heading}</h1>
          {totalProducts > 0 ? <p className={styles.count}>{t("productsCount", { count: totalProducts })}</p> : null}
        </div>
        <div className={styles.searchWrap}>
          <CatalogSearch locale={locale} initial={sParams.q || ""} />
        </div>
        {categories.length > 0 ? (
          <nav aria-label={t("categories")} className={styles.chips}>
            <ChipLink href={`/${locale}/c`} label={t("all")} selected={isAll && !q} />
            {categories.map((c) => (
              <ChipLink key={c.name} href={`/${locale}/c/${encodeURIComponent(c.name)}`} label={c.name} count={c.count} selected={!isAll && main === c.name && !sub} />
            ))}
          </nav>
        ) : null}
        {subs.length > 0 && activeCategory ? (
          <nav aria-label={t("subcategories")} className={styles.chips}>
            <ChipLink href={`/${locale}/c/${encodeURIComponent(activeCategory.name)}`} label={t("allIn", { category: activeCategory.name })} selected={!sub} />
            {subs.map(([name, count]) => (
              <ChipLink key={name} href={`/${locale}/c/${encodeURIComponent(activeCategory.name)}/${encodeURIComponent(name)}`} label={name} count={count} selected={sub === name} />
            ))}
          </nav>
        ) : null}
        {totalProducts > 0 ? <p className={styles.phoneCount}>{t("productsCount", { count: totalProducts })}</p> : null}
        {content}
      </div>
    </CoreShell>
  );
}
