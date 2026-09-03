import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cdnImage, getPublicCategories, getPublicCategoryProducts, type PublicProductCard } from "@/lib/api/public-products-server";
import { JsonLd } from "@/components-next/json-ld";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { ChevronLeft, Pill } from "lucide-react";
import styles from "./category-page.module.css";

type Props = {
  params: Promise<{ locale: string; category?: string[] }>;
  searchParams: Promise<{ page?: string }>;
};

function parsePage(raw?: string) {
  const n = Number(raw || "1");
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isLocale(locale)) return {};
  const decoded = (category || []).map((c) => decodeURIComponent(c));
  const page = parsePage((await searchParams).page);
  const name = decoded[decoded.length - 1];
  const path = `/c${decoded.length ? `/${decoded.map(encodeURIComponent).join("/")}` : ""}`;
  const canonical = localizedUrl(locale, path);
  const title = name ? name : "الأقسام والمنتجات";
  const description = name ? `${name} — نبض بلس` : "تصفح أقسام الأدوية والمنتجات الصحية من نبض بلس";
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

function Card({ locale, item }: { locale: string; item: PublicProductCard }) {
  const src = cdnImage(item.image);
  return <Link className={styles.card} href={`/${locale}/p/${encodeURIComponent(item.slug)}`}>
    <span className={styles.cardMedia}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={item.name || ""} width={140} height={140} loading="lazy" decoding="async" />
        : <Pill size={26} aria-hidden="true" />}
    </span>
    <span className={styles.cardBody}>
      <span className={styles.cardName}>{item.name}</span>
      <span className={styles.cardMeta}>{[item.form, item.strength, item.package_size].filter(Boolean).join(" · ")}</span>
      <span className={styles.cardPrice}>
        {item.price.toFixed(2)} {item.currency}
        {item.old_price && item.old_price > item.price ? <s>{item.old_price.toFixed(2)}</s> : null}
      </span>
    </span>
  </Link>;
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, category } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("PublicProduct");
  const decoded = (category || []).map((c) => decodeURIComponent(c));
  if (decoded.length > 2) notFound();
  const page = parsePage((await searchParams).page);
  const [main, sub] = decoded;

  // Category index (/c): tree of clusters with live counts.
  if (!main) {
    const tree = await getPublicCategories(locale);
    const jsonLd = {
      "@context": "https://schema.org", "@type": "CollectionPage",
      name: t("products"), url: localizedUrl(locale, "/c"), inLanguage: locale,
    };
    return <main className={`main ${styles.page}`}>
      <JsonLd data={jsonLd} />
      <h1 className={styles.h1}>{t("allCategories")}</h1>
      <ul className={styles.tree}>
        {(tree?.categories || []).map((c) => <li key={c.name} className={styles.treeItem}>
          <Link href={`/${locale}/c/${encodeURIComponent(c.name)}`} className={styles.treeMain}>
            <span>{c.name}</span><span className={styles.count}>{c.count}</span>
          </Link>
          {Object.keys(c.subs).length ? <ul className={styles.subs}>
            {Object.entries(c.subs).slice(0, 12).map(([s, n]) => (
              <li key={s}><Link href={`/${locale}/c/${encodeURIComponent(c.name)}/${encodeURIComponent(s)}`}>{s} <span className={styles.count}>{n}</span></Link></li>
            ))}
          </ul> : null}
        </li>)}
      </ul>
    </main>;
  }

  const data = await getPublicCategoryProducts(locale, main, sub, page);
  if (!data) notFound();
  const heading = sub || main;
  const basePath = `/${locale}/c/${encodeURIComponent(main)}${sub ? `/${encodeURIComponent(sub)}` : ""}`;
  const pages = Math.max(Math.ceil(data.total / data.limit), 1);
  const jsonLd: Array<Record<string, unknown>> = [
    {
      "@context": "https://schema.org", "@type": "CollectionPage",
      name: heading, url: localizedUrl(locale, basePath.slice(`/${locale}`.length)), inLanguage: locale,
      mainEntity: {
        "@type": "ItemList", numberOfItems: data.total,
        itemListElement: data.items.slice(0, 24).map((it, i) => ({
          "@type": "ListItem", position: (page - 1) * data.limit + i + 1,
          url: localizedUrl(locale, `/p/${encodeURIComponent(it.slug)}`), name: it.name || undefined,
        })),
      },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("home"), item: localizedUrl(locale) },
        { "@type": "ListItem", position: 2, name: t("products"), item: localizedUrl(locale, "/c") },
        ...(sub
          ? [
              { "@type": "ListItem", position: 3, name: main, item: localizedUrl(locale, `/c/${encodeURIComponent(main)}`) },
              { "@type": "ListItem", position: 4, name: sub },
            ]
          : [{ "@type": "ListItem", position: 3, name: main }]),
      ],
    },
  ];

  return <main className={`main ${styles.page}`}>
    <JsonLd data={jsonLd} />
    <nav className={styles.crumbs} aria-label="breadcrumb">
      <Link href={`/${locale}/c`}>{t("allCategories")}</Link>
      {sub ? <>
        <span aria-hidden="true">/</span>
        <Link href={`/${locale}/c/${encodeURIComponent(main)}`}>{main}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{sub}</span>
      </> : <><span aria-hidden="true">/</span><span aria-current="page">{main}</span></>}
    </nav>
    <header className={styles.header}>
      <h1 className={styles.h1}>{heading}</h1>
      <p className={styles.subline}>{t("productsInCategory").replace("{count}", String(data.total))}</p>
    </header>
    {data.items.length === 0
      ? <p className={styles.empty}>{t("emptyCategory")}</p>
      : <div className={styles.gridCards}>{data.items.map((it) => <Card key={it.id} locale={locale} item={it} />)}</div>}
    {pages > 1 ? <nav className={styles.pager} aria-label="pagination">
      {page > 1 ? <Link href={`${basePath}?page=${page - 1}`}><ChevronLeft size={15} aria-hidden="true" />{t("backToCatalog")}</Link> : null}
      <span>{t("page").replace("{page}", `${page} / ${pages}`)}</span>
      {page < pages ? <Link href={`${basePath}?page=${page + 1}`}>{t("loadMore")}</Link> : null}
    </nav> : null}
  </main>;
}
