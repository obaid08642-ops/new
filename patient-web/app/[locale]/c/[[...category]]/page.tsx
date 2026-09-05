import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cdnImage, getPublicCategories, getPublicCategoryProducts, type PublicProductCard } from "@/lib/api/public-products-server";
import { JsonLd } from "@/components-next/json-ld";
import { QuickAddCartBtn } from "@/components-next/quick-add-cart-btn";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import {
  ChevronLeft,
  Sparkles,
  Search,
  ShieldCheck,
  Truck,
  RotateCcw,
  Pill,
} from "lucide-react";
import {
  VectorPharmacy,
  VectorCatAll,
  VectorCatHairCare,
  VectorCatCosmetics,
  VectorCatSkinCare,
  VectorCatBabyCare,
  VectorCatVitamins,
  VectorCatPersonalCare,
  VectorRadiology,
  VectorEmergency,
} from "@/components-next/vector-illustrations";
import styles from "./category-page.module.css";

type Props = {
  params: Promise<{ locale: string; category?: string[] }>;
  searchParams: Promise<{ page?: string; q?: string }>;
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

function renderProductMedia(item: PublicProductCard) {
  const cdn = cdnImage(item.image);
  if (cdn) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={cdn}
        alt={item.name || ""}
        width={140}
        height={140}
        loading="lazy"
        decoding="async"
        style={{ objectFit: "contain" }}
      />
    );
  }
  const n = ((item.name || "") + " " + (item.slug || "")).toLowerCase();
  if (n.includes("شعر") || n.includes("hair") || n.includes("شامبو")) return <VectorCatHairCare size={64} />;
  if (n.includes("مكياج") || n.includes("تجميل") || n.includes("cosmetic") || n.includes("روج")) return <VectorCatCosmetics size={64} />;
  if (n.includes("بشرة") || n.includes("skin") || n.includes("سيروم") || n.includes("كريم")) return <VectorCatSkinCare size={64} />;
  if (n.includes("طفل") || n.includes("baby") || n.includes("حليب") || n.includes("حفاض")) return <VectorCatBabyCare size={64} />;
  if (n.includes("فيتامين") || n.includes("vitamin") || n.includes("أوميغا") || n.includes("زنك")) return <VectorCatVitamins size={64} />;
  if (n.includes("معجون") || n.includes("نظافة") || n.includes("شخصية") || n.includes("غسول")) return <VectorCatPersonalCare size={64} />;
  return <VectorPharmacy size={64} />;
}

function Card({ locale, item }: { locale: string; item: PublicProductCard }) {
  return (
    <div className={styles.card}>
      <Link href={`/${locale}/p/${encodeURIComponent(item.slug)}`} className={styles.cardMediaWrap}>
        <span className={styles.cardMedia}>
          {renderProductMedia(item)}
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
            image: cdnImage(item.image) ?? undefined,
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
  const typedLocale = locale as Locale;
  setRequestLocale(typedLocale);
  const t = await getTranslations("PublicProduct");
  const decoded = (category || []).map((c) => decodeURIComponent(c));
  if (decoded.length > 2) notFound();
  const sParams = await searchParams;
  const page = parsePage(sParams.page);
  const [main, sub] = decoded;

  const [tree, data] = await Promise.all([
    getPublicCategories(typedLocale),
    getPublicCategoryProducts(typedLocale, main || "all", sub, page),
  ]);

  const isAll = !main || main === "all" || main === "الكل";
  const heading = isAll
    ? locale === "ar"
      ? "جميع الأدوية والمنتجات الصحية"
      : "All Medicines & Health Products"
    : sub || main;
  const totalProducts = data?.total ?? 0;
  const pages = Math.max(Math.ceil(totalProducts / (data?.limit || 24)), 1);
  const basePath = isAll
    ? `/${locale}/c`
    : `/${locale}/c/${encodeURIComponent(main)}${sub ? `/${encodeURIComponent(sub)}` : ""}`;

  const CANONICAL_CATEGORIES = [
    { id: "all", name: locale === "ar" ? "الكل" : "All", slug: "all", icon: <VectorCatAll size={44} />, matchKey: "all" },
    { id: "medications", name: locale === "ar" ? "أدوية وعلاجات" : "Medicines", slug: "أدوية وعلاجات", icon: <VectorPharmacy size={44} />, matchKey: "medications" },
    { id: "hair-care", name: locale === "ar" ? "عناية بالشعر" : "Hair Care", slug: "عناية بالشعر", icon: <VectorCatHairCare size={44} />, matchKey: "hair" },
    { id: "cosmetics", name: locale === "ar" ? "مكياج وإكسسوارات" : "Makeup & Beauty", slug: "مكياج وإكسسوارات", icon: <VectorCatCosmetics size={44} />, matchKey: "cosmetic" },
    { id: "skincare", name: locale === "ar" ? "العناية بالبشرة" : "Skin Care", slug: "العناية بالبشرة", icon: <VectorCatSkinCare size={44} />, matchKey: "skin" },
    { id: "baby", name: locale === "ar" ? "الأم والطفل" : "Mother & Baby", slug: "الأم والطفل", icon: <VectorCatBabyCare size={44} />, matchKey: "baby" },
    { id: "vitamins", name: locale === "ar" ? "فيتامينات ومكملات" : "Vitamins", slug: "فيتامينات ومكملات", icon: <VectorCatVitamins size={44} />, matchKey: "vitamin" },
    { id: "personal-care", name: locale === "ar" ? "عناية شخصية" : "Personal Care", slug: "عناية شخصية", icon: <VectorCatPersonalCare size={44} />, matchKey: "personal" },
  ];

  const categoriesList = CANONICAL_CATEGORIES.map((c) => {
    const isCatActive = c.id === "all" ? isAll : (main === c.slug || main === c.id || (main && main.toLowerCase().includes(c.matchKey)));
    return {
      id: c.id,
      name: c.name,
      link: c.id === "all" ? `/${locale}/c` : `/${locale}/c/${encodeURIComponent(c.slug)}`,
      icon: c.icon,
      isActive: isCatActive,
      count: c.id === "all" ? totalProducts : (tree?.categories.find((tc) => tc.name.includes(c.name) || tc.name.includes(c.matchKey))?.count || null),
    };
  });

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
        itemListElement: (data?.items || []).slice(0, 24).map((it, i) => ({
          "@type": "ListItem",
          position: (page - 1) * (data?.limit || 24) + i + 1,
          url: localizedUrl(locale, `/p/${encodeURIComponent(it.slug)}`),
          name: it.name || undefined,
        })),
      },
    },
  ];

  return (
    <main className={`main ${styles.page}`}>
      <JsonLd data={jsonLd} />

      {/* Top Search Bar */}
      <section className={styles.searchBarWrap}>
        <form action={`/${locale}/c`} method="GET" className={styles.searchBar}>
          <Search size={20} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={sParams.q || ""}
            placeholder={
              locale === "ar"
                ? "ابحث عن دواء أو منتج صحي بالاسم أو المادة الفعالة..."
                : "Search medicines or active ingredients..."
            }
            className={styles.searchInput}
            aria-label="Search medicines"
          />
          <button type="submit" className={styles.searchButton}>
            {locale === "ar" ? "بحث" : "Search"}
          </button>
        </form>
      </section>

      {/* Branded Luxury Pharmacy Hero Banner */}
      <section className={styles.pharmacyHero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} aria-hidden="true" />
            <span>{locale === "ar" ? "صيدلية نبض المعتمدة" : "Nabd Verified Pharmacy"}</span>
          </div>
          <h1 className={styles.heroTitle}>
            {locale === "ar"
              ? "صيدلية رقمية متكاملة برعاية طبية فائقة"
              : "Integrated Digital Pharmacy with Clinical Care"}
          </h1>
          <p className={styles.heroSubtext}>
            {locale === "ar"
              ? "تسوق آلاف الأدوية والمستلزمات الطبية الأصلية 100% بأسعار رسمية معتمدة مع خدمة التوصيل الفوري واستشارات صيدلانية متخصصة على مدار الساعة."
              : "Order 100% genuine licensed medications with instant delivery and 24/7 pharmacist guidance."}
          </p>
          <div className={styles.heroPills}>
            <span className={styles.heroPill}>
              <ShieldCheck size={14} color="#00E599" aria-hidden="true" />
              {locale === "ar" ? "أدوية مرخصة 100%" : "100% Genuine & Licensed"}
            </span>
            <span className={styles.heroPill}>
              <Truck size={14} color="#00E599" aria-hidden="true" />
              {locale === "ar" ? "توصيل فوري مبرد" : "Cold-Chain Fast Delivery"}
            </span>
            <span className={styles.heroPill}>
              <RotateCcw size={14} color="#00E599" aria-hidden="true" />
              {locale === "ar" ? "إرجاع واستبدال مرن" : "Flexible Returns"}
            </span>
          </div>
        </div>
        <div className={styles.heroVectorWrap}>
          <VectorPharmacy size={80} />
        </div>
      </section>

      {/* Category Horizontal Rail (مربعات وسطية تتسحب يمين وشمال) */}
      <section className={styles.railSection}>
        <div className={styles.railHeader}>
          <h2 className={styles.railTitle}>
            {locale === "ar" ? "تصفح حسب الفئة" : "Browse by Category"}
          </h2>
          <span className={styles.railSubtitle}>
            {locale === "ar" ? "اسحب لاكتشاف كافة الأقسام" : "Swipe to explore categories"}
          </span>
        </div>
        <div className={styles.categoryRail} role="tablist">
          {categoriesList.map((cat) => (
            <Link
              key={cat.id}
              href={cat.link}
              className={`${styles.categoryCard} ${cat.isActive ? styles.categoryCardActive : ""}`}
              role="tab"
              aria-selected={cat.isActive}
            >
              <div className={styles.catCardIcon}>{cat.icon}</div>
              <strong className={styles.catCardTitle}>{cat.name}</strong>
              <span className={styles.catCardCount}>
                {cat.count > 0 ? `${cat.count} ${locale === "ar" ? "منتج" : "items"}` : ""}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Products Section DIRECTLY BELOW (مرصوص الأدوية على طول) */}
      <section className={styles.productsSection}>
        <div className={styles.productsSectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <h2 className={styles.sectionTitle}>{heading}</h2>
            <span className={styles.sectionBadge}>
              {totalProducts} {locale === "ar" ? "منتج متاح" : "available"}
            </span>
          </div>
          {sub ? (
            <div className={styles.crumbs}>
              <Link href={`/${locale}/c`}>{locale === "ar" ? "الكل" : "All"}</Link>
              <span>/</span>
              <Link href={`/${locale}/c/${encodeURIComponent(main)}`}>{main}</Link>
              <span>/</span>
              <span>{sub}</span>
            </div>
          ) : null}
        </div>

        {!data || data.items.length === 0 ? (
          <div className={styles.empty}>
            <Pill size={36} color="#64748B" style={{ margin: "0 auto 10px", display: "block" }} />
            <p>
              {locale === "ar"
                ? "لا توجد أدوية متطابقة في هذه الفئة حالياً."
                : "No medicines found in this category."}
            </p>
            <Link
              href={`/${locale}/c`}
              className={styles.searchButton}
              style={{ display: "inline-block", marginTop: 12, textDecoration: "none" }}
            >
              {locale === "ar" ? "استعراض جميع الأدوية" : "Browse All Medicines"}
            </Link>
          </div>
        ) : (
          <div className={styles.gridCards} style={{ marginTop: 16 }}>
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
      </section>
    </main>
  );
}
