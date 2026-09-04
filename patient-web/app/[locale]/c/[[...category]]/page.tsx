import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cdnImage, getPublicCategories, getPublicCategoryProducts, type PublicProductCard } from "@/lib/api/public-products-server";
import { JsonLd } from "@/components-next/json-ld";
import { QuickAddCartBtn } from "@/components-next/quick-add-cart-btn";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { ChevronLeft, Sparkles, HeartPulse, ShieldAlert, Stethoscope, Pill } from "lucide-react";
import { VectorPharmacy } from "@/components-next/vector-illustrations";
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
  const src = cdnImage(item.image) || "/images/categories/medications.jpg";
  return (
    <div className={styles.card}>
      <Link href={`/${locale}/p/${encodeURIComponent(item.slug)}`} className={styles.cardMediaWrap}>
        <span className={styles.cardMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={item.name || ""} width={140} height={140} loading="lazy" decoding="async" style={{ objectFit: "contain" }} />
        </span>
      </Link>
      <div className={styles.cardBody}>
        <Link href={`/${locale}/p/${encodeURIComponent(item.slug)}`} className={styles.cardName}>
          {item.name}
        </Link>
        <span className={styles.cardMeta}>
          {[item.form, item.strength, item.package_size].filter(Boolean).join(" · ")}
        </span>
        <div className={styles.cardPriceRow}>
          <span className={styles.cardPrice}>
            {item.price.toFixed(2)} {item.currency}
            {item.old_price && item.old_price > item.price ? <s>{item.old_price.toFixed(2)}</s> : null}
          </span>
        </div>
        <QuickAddCartBtn
          item={{
            id: item.id,
            name: item.name || "",
            price: item.price,
            image: src ?? undefined,
            form: item.form,
            strength: item.strength,
            slug: item.slug,
          }}
          labels={{
            add: locale === "ar" ? "أضف للسلة" : "Add to cart",
            added: locale === "ar" ? "تمت الإضافة" : "Added",
          }}
        />
      </div>
    </div>
  );
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
    return (
      <main className={`main ${styles.page}`}>
        <JsonLd data={jsonLd} />
        
        {/* Horizontal Category Hero & Rail */}
        <header className={styles.catHeader}>
          <div className={styles.catHeroTitle}>
            <div className={styles.catBadge}>
              <Sparkles size={16} />
              <span>صيدلية نبض المعتمدة</span>
            </div>
            <h1 className={styles.h1}>{t("allCategories")}</h1>
            <p className={styles.catSubtext}>تصفح جميع الأدوية والمستلزمات الطبية المعتمدة بأسعار رسمية وتوصيل فوري</p>
          </div>
        </header>

        {/* Categories Rail Grid */}
        <div className={styles.categoryGrid}>
          {(tree?.categories || []).map((c) => (
            <div key={c.name} className={styles.categoryTile}>
              <Link href={`/${locale}/c/${encodeURIComponent(c.name)}`} className={styles.tileHeader}>
                <div className={styles.tileIconWrap} style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", border: "2px solid #5FD9B3", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={
                      c.name.includes("فيتامين") ? "/images/categories/vitamins.jpg" :
                      c.name.includes("بشرة") || c.name.includes("تجميل") ? "/images/categories/skincare.jpg" :
                      c.name.includes("طفل") || c.name.includes("أم") ? "/images/categories/babycare.jpg" :
                      c.name.includes("جهاز") || c.name.includes("أجهزة") ? "/images/categories/devices.jpg" :
                      c.name.includes("إسعاف") ? "/images/categories/firstaid.jpg" :
                      "/images/categories/medications.jpg"
                    } 
                    alt={c.name} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                </div>
                <div className={styles.tileInfo}>
                  <strong className={styles.tileName}>{c.name}</strong>
                  <span className={styles.tileCount}>{c.count} منتج</span>
                </div>
              </Link>
              {Object.keys(c.subs).length ? (
                <div className={styles.subChips}>
                  {Object.entries(c.subs).slice(0, 8).map(([s, n]) => (
                    <Link
                      key={s}
                      href={`/${locale}/c/${encodeURIComponent(c.name)}/${encodeURIComponent(s)}`}
                      className={styles.subChip}
                    >
                      <span>{s}</span>
                      <span className={styles.chipCount}>({n})</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </main>
    );
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

  return (
    <main className={`main ${styles.page}`}>
      <JsonLd data={jsonLd} />
      <nav className={styles.crumbs} aria-label="breadcrumb">
        <Link href={`/${locale}/c`}>{t("allCategories")}</Link>
        {sub ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/c/${encodeURIComponent(main)}`}>{main}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{sub}</span>
          </>
        ) : (
          <>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{main}</span>
          </>
        )}
      </nav>
      <header className={styles.header}>
        <h1 className={styles.h1}>{heading}</h1>
        <p className={styles.subline}>{t("productsInCategory").replace("{count}", String(data.total))}</p>
      </header>
      {data.items.length === 0 ? (
        <p className={styles.empty}>{t("emptyCategory")}</p>
      ) : (
        <div className={styles.gridCards}>
          {data.items.map((it) => (
            <Card key={it.id} locale={locale} item={it} />
          ))}
        </div>
      )}
      {pages > 1 ? (
        <nav className={styles.pager} aria-label="pagination">
          {page > 1 ? (
            <Link href={`${basePath}?page=${page - 1}`}>
              <ChevronLeft size={15} aria-hidden="true" />
              {t("backToCatalog")}
            </Link>
          ) : null}
          <span>{t("page").replace("{page}", `${page} / ${pages}`)}</span>
          {page < pages ? <Link href={`${basePath}?page=${page + 1}`}>{t("loadMore")}</Link> : null}
        </nav>
      ) : null}
    </main>
  );
}
