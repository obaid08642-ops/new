import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseCatalogueFilters, readCatalogueFilterOptions, readPublicCategories, readPublicCategoryProducts } from "@/lib/api/public-products-server";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { JsonLd } from "@/components-next/json-ld";
import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { CoreShell } from "@/components-next/core/core-shell";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { CatalogSearch } from "@/components-next/pharmacy/catalog-search";
import { CatalogueFilterPanel, filtersQuery } from "@/components-next/pharmacy/catalogue-filters";
import { ChipLink } from "@/components-next/pharmacy/chip-link";
import { CategoryTile } from "@/components-next/pharmacy/category-tile";
import { ProductGrid } from "@/components-next/pharmacy/product-grid";
import { productCardImageSrc } from "@/components-next/pharmacy/catalog-image";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import styles from "@/components-next/pharmacy/pharmacy.module.css";
import consult from "@/components-next/consult/consult.module.css";

/**
 * F82-3: the category list is one view with two routes. The static/ISR page (no `searchParams`: page 1, no search) is the
 * one that is cached and shared; a request with `?page=` or `?q=` is answered by the dynamic twin under /q (proxy.ts,
 * lib/security/query-twin.ts), which passes `searchParams`. `searchParams` is undefined on the static route.
 */
export type CategoryViewProps = {
  params: Promise<{ locale: string; category?: string[] }>;
  searchParams?: Promise<{ page?: string; q?: string; sort?: string; form?: string; brand?: string; rx?: string; price_min?: string; price_max?: string }>;
};
type Props = CategoryViewProps;

/** The window of the static page: the catalogue reads it is made of are cached for the same hour (lib/api/public-products-server.ts). */
export const CATEGORY_REVALIDATE_SECONDS = 3600;

/** #816: the orders the catalogue API accepts; anything else is the default popularity order. */
const SORTS = [
  { id: "popular", label: "sortPopular" }, // i18n-ok: label is a PharmacyBrowse message key
  { id: "price_asc", label: "sortPriceAsc" }, // i18n-ok: label is a PharmacyBrowse message key
  { id: "price_desc", label: "sortPriceDesc" }, // i18n-ok: label is a PharmacyBrowse message key
  { id: "newest", label: "sortNewest" }, // i18n-ok: label is a PharmacyBrowse message key
] as const;
type Sort = (typeof SORTS)[number]["id"];
const parseSort = (raw?: string): Sort => (SORTS.find((s) => s.id === raw)?.id ?? "popular");

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
  const sort = parseSort(sParams.sort);
  const [main, sub] = decoded;
  // issue 1819: dosage form, maker, Rx and price range (the app's filter sheet); only the dynamic twin ever carries them
  const filters = parseCatalogueFilters(sParams);
  const filterQuery = filtersQuery(filters);

  const [treeRead, dataRead, filterOptions] = await Promise.all([
    readPublicCategories(typedLocale),
    readPublicCategoryProducts(typedLocale, main || "all", sub, page, q, sort, filters),
    readCatalogueFilterOptions(),
  ]);
  // A failed read (no answer, or a 5xx) is not an empty catalogue: this page is cached, and a cached "no products" or error
  // would replace the good copy. Throwing keeps it (stale-if-error, #302).
  if (treeRead.failed || dataRead.failed) throw new PublicDataUnavailableError("category");
  const tree = treeRead.data;
  const data = dataRead.data;

  const isAll = !main || main === "all" || main === "الكل";
  const heading = q ? t("resultsFor", { query: q }) : isAll ? t("pageTitle") : (sub || main);
  const totalProducts = data?.total ?? 0;
  const pages = Math.max(Math.ceil(totalProducts / (data?.limit || 24)), 1);
  const qParam = `${q ? `&q=${encodeURIComponent(q)}` : ""}${sort !== "popular" ? `&sort=${sort}` : ""}${filterQuery ? `&${filterQuery}` : ""}`;
  const basePath = isAll
    ? `/${locale}/c`
    : `/${locale}/c/${encodeURIComponent(main)}${sub ? `/${encodeURIComponent(sub)}` : ""}`;

  // The category rail is the API's own tree for this language (names and live counts), not a fixed list.
  const categories = tree?.categories || [];
  const activeCategory = isAll ? undefined : categories.find((c) => c.name === main);
  // the API sends a count per sub-category; it orders the chips and is never shown (owner, 2026-10-26)
  const subs = activeCategory ? Object.entries(activeCategory.subs).sort((a, b) => b[1] - a[1]) : [];

  // The active filters as removable chips (addition a): each link is the same page without that one filter.
  const hrefWithout = (drop: Array<keyof typeof filters>) => {
    const kept = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && !drop.includes(k as keyof typeof filters))) as typeof filters;
    const query = [q ? `q=${encodeURIComponent(q)}` : "", sort !== "popular" ? `sort=${sort}` : "", filtersQuery(kept)].filter(Boolean).join("&");
    return query ? `${basePath}?${query}` : basePath;
  };
  const activeChips = [
    filters.form ? { key: "form", label: filters.form, href: hrefWithout(["form"]) } : null,
    filters.brand ? { key: "brand", label: filters.brand, href: hrefWithout(["brand"]) } : null,
    filters.rx ? { key: "rx", label: filters.rx === "true" ? t("filterRxOnly") : t("filterRxNone"), href: hrefWithout(["rx"]) } : null,
    filters.price_min || filters.price_max
      ? { key: "price", label: [filters.price_min ? `${t("filterPriceMin")} ${filters.price_min}` : "", filters.price_max ? `${t("filterPriceMax")} ${filters.price_max}` : ""].filter(Boolean).join(" · "), href: hrefWithout(["price_min", "price_max"]) }
      : null,
  ].filter((chip): chip is { key: string; label: string; href: string } => chip !== null);
  const resetAllHref = hrefWithout(["form", "brand", "rx", "price_min", "price_max"]);

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
        {/* Not in the catalogue: ask the nearby pharmacies for it by name (decision 12; journeys scenario 8, issue 1080). */}
        <Link href={`/${locale}/pharmacy/request${q ? `?name=${encodeURIComponent(q.slice(0, 200))}` : ""}`} className={`nabd-button nabd-button--secondary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
          <span className="nabd-button__label">{t("askPharmacies")}</span>
        </Link>
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
            thumb: productCardImageSrc(it.image),
            images: it.images,
            form: it.form,
            strength: it.strength,
            packageSize: it.package_size,
            rx: it.is_rx,
            onlineOnly: it.online_exclusive === true,
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
        </div>
        <div className={styles.searchWrap}>
          <CatalogSearch locale={locale} initial={sParams.q || ""} />
        </div>
        {/* The upload-prescription shortcut. Reminders and My orders moved to Home (two quick tiles), favourites and the cart to the header
            (owner layout decisions, 2026-10-26). A plain link, so the cached page stays the same for everyone. */}
        {isAll && !q && page === 1 ? (
          <nav aria-label={t("hubShortcuts")} className={styles.hub}>
            <Link className={`${styles.row} ${styles.hubUpload}`} href={`/${locale}/pharmacy/rx-order?via=photo`}>
              <span className={styles.rowMedia}><FIcon icon="prescription" tone={PHARMACY_TONE} chip="solid" size={56} /></span>
              <span className={styles.rowBody}>
                <span className={styles.rowName}>{t("hubUploadTitle")}</span>
                <span className={styles.rowSub}>{t("hubUploadBody")}</span>
              </span>
            </Link>
          </nav>
        ) : null}
        {categories.length > 0 ? (
          <nav aria-label={t("categories")}>
            <ul className={styles.catGrid}>
              <li><CategoryTile href={`/${locale}/c`} label={t("all")} art="all" selected={isAll && !q} /></li>
              {categories.map((c) => (
                <li key={c.name}><CategoryTile href={`/${locale}/c/${encodeURIComponent(c.name)}`} label={c.name} selected={!isAll && main === c.name && !sub} /></li>
              ))}
            </ul>
          </nav>
        ) : null}
        {subs.length > 0 && activeCategory ? (
          <nav aria-label={t("subcategories")} className={styles.chips}>
            <ChipLink href={`/${locale}/c/${encodeURIComponent(activeCategory.name)}`} label={t("allIn", { category: activeCategory.name })} selected={!sub} />
            {subs.map(([name]) => (
              <ChipLink key={name} href={`/${locale}/c/${encodeURIComponent(activeCategory.name)}/${encodeURIComponent(name)}`} label={name} selected={sub === name} />
            ))}
          </nav>
        ) : null}
        {activeChips.length > 0 ? (
          <div className={styles.chipsRow} role="group" aria-label={t("activeFilters")}>
            {activeChips.map((chip) => (
              <Link key={chip.key} href={chip.href} className={styles.activeChip} aria-label={t("removeFilter", { filter: chip.label })}>
                <bdi>{chip.label}</bdi>
                <span aria-hidden="true" className={styles.activeChipX}>×</span>
              </Link>
            ))}
            <Link href={resetAllHref} className={consult.activeFilterClear}>{t("clearAll")}</Link>
          </div>
        ) : null}
        <CatalogueFilterPanel
          locale={locale}
          resetHref={`${basePath}${q || sort !== "popular" ? `?${[q ? `q=${encodeURIComponent(q)}` : "", sort !== "popular" ? `sort=${sort}` : ""].filter(Boolean).join("&")}` : ""}`}
          filters={filters}
          options={filterOptions}
          hidden={{ ...(q ? { q } : {}), ...(sort !== "popular" ? { sort } : {}) }}
        />
        {totalProducts > 1 ? (
          <nav aria-label={t("sortLabel")} className={styles.chips}>
            {SORTS.map((o) => {
              const query = [q ? `q=${encodeURIComponent(q)}` : "", o.id !== "popular" ? `sort=${o.id}` : "", filterQuery].filter(Boolean).join("&");
              return <ChipLink key={o.id} href={query ? `${basePath}?${query}` : basePath} label={t(o.label)} selected={sort === o.id} />;
            })}
          </nav>
        ) : null}
        {content}
      </div>
    </CoreShell>
  );
}
