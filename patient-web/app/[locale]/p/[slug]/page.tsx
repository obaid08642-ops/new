import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cdnImage, getPublicProduct, type PublicProduct } from "@/lib/api/public-products-server";
import { JsonLd } from "@/components-next/json-ld";
import { ProductCartActions } from "@/components-next/product-cart-actions";
import { ProductGalleryModal } from "@/components-next/product-gallery-modal";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { ChevronLeft, ShieldCheck, FileText, AlertCircle, Info, Sparkles } from "lucide-react";
import styles from "./product-page.module.css";

type Props = { params: Promise<{ locale: string; slug: string }> };

function hreflangMap(product: PublicProduct) {
  return Object.fromEntries([
    ...locales.map((l) => {
      const slug = product.slugs?.[l] || product.slugs?.en || product.slugs?.ar || product.slug;
      return [l, localizedUrl(l, `/p/${encodeURIComponent(slug)}`)];
    }),
    ["x-default", localizedUrl("ar", `/p/${encodeURIComponent(product.slugs?.ar || product.slug)}`)],
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const product = await getPublicProduct(locale, slug);
  if (!product) return { robots: { index: false, follow: false } };
  const name = product.name || product.official_name || "Product";
  const canonical = localizedUrl(locale, `/p/${encodeURIComponent(product.slug)}`);
  const description = (product.description || `${name} — ${[product.form, product.strength, product.package_size].filter(Boolean).join(" ")}`)
    .replace(/\s+/g, " ").slice(0, 160);
  const image = cdnImage(product.image) || (product.images?.[0] ? cdnImage(product.images[0]) : null);
  return {
    title: name,
    description,
    alternates: { canonical, languages: hreflangMap(product) },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    openGraph: {
      title: name, description, url: canonical, type: "website", siteName: "Nabd Plus",
      locale: locale === "ar" ? "ar_SA" : locale,
      images: image ? [{ url: image, alt: name }] : undefined,
    },
    twitter: { card: "summary_large_image", title: name, description, images: image ? [image] : undefined },
  };
}

function facts(product: PublicProduct, t: (k: string) => string): Array<[string, string]> {
  const rows: Array<[string, string | null | undefined]> = [
    [t("activeIngredient"), product.active_ingredient],
    [t("form"), product.form],
    [t("strength"), product.strength],
    [t("packageSize"), product.package_size || product.package_content_details],
    [t("category"), [product.category, product.sub_category, product.sub_sub_category].filter(Boolean).join(" › ") || null],
    [t("manufacturer"), product.manufacturer],
    [t("origin"), product.country_of_origin],
    [t("barcode"), product.barcode],
    [t("sku"), product.sku != null ? String(product.sku) : null],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

export default async function PublicProductPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("PublicProduct");
  const product = await getPublicProduct(locale, slug);
  if (!product) notFound();
  const name = product.name || product.official_name || t("products");
  const canonical = localizedUrl(locale, `/p/${encodeURIComponent(product.slug)}`);
  const rawImages = (product.images && product.images.length > 0 ? product.images : [product.image]).filter((u): u is string => Boolean(u));
  const images = rawImages.map((u) => cdnImage(u) || u).filter(Boolean);
  const categoryPath = product.category
    ? `/${locale}/c/${encodeURIComponent(product.category)}${product.sub_category ? `/${encodeURIComponent(product.sub_category)}` : ""}`
    : null;

  const availabilityLabel = product.available ? t("available") : t("limited");

  return (
    <main className={`main ${styles.page}`}>
      <nav className={styles.crumbs} aria-label="breadcrumb">
        <Link href={`/${locale}`}>{t("home")}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/${locale}/c`}>{t("products")}</Link>
        {product.category && categoryPath ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={categoryPath}>{product.category}</Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{name}</span>
      </nav>

      {/* Hero with Gallery Lightbox & Purchase Actions */}
      <section className={styles.hero}>
        <div className={styles.heroMedia}>
          <ProductGalleryModal name={name} images={images} />
          {product.has_discount ? (
            <span className={styles.badge}>
              {t("discount").replace("{percent}", String(product.discount_percent))}
            </span>
          ) : null}
        </div>
        <div className={styles.heroText}>
          <div className={styles.eyebrowWrap}>
            <p className={styles.eyebrow}>
              <ShieldCheck size={16} aria-hidden="true" />
              <span>{product.is_rx ? t("rxRequired") : t("otc")} · {availabilityLabel}</span>
            </p>
          </div>
          <h1>{name}</h1>
          <div className={styles.priceCard}>
            <div className={styles.priceRow}>
              <strong className={styles.price}>{product.price.toFixed(2)} {product.currency}</strong>
              {product.old_price && product.old_price > product.price ? (
                <s className={styles.oldPrice}>{product.old_price.toFixed(2)} {product.currency}</s>
              ) : null}
            </div>
            <p className={styles.subline}>{[product.form, product.strength, product.package_size].filter(Boolean).join(" · ")}</p>
          </div>

          {/* Add to Cart Actions */}
          <div className={styles.actionWrap}>
            <ProductCartActions
              locale={locale}
              product={{
                id: product.id,
                name,
                price: product.price,
                rx: product.is_rx,
                image: images[0] || null,
                slug: product.slug,
                activeIngredient: product.active_ingredient,
                form: product.form,
                strength: product.strength,
              }}
            />
          </div>
        </div>
      </section>

      {/* Key Facts & Specifications Grid */}
      <section className={styles.detail} aria-label={t("facts")}>
        <div className={styles.sectionHeading}>
          <Info size={20} color="#00876F" />
          <h2 className={styles.h2}>{t("facts")}</h2>
        </div>
        <dl className={styles.grid}>
          {facts(product, t).map(([label, value]) => (
            <div className={styles.item} key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Clear Medical Descriptions & Usage Blocks with distinct typography */}
      {product.description ? (
        <section className={styles.block}>
          <div className={styles.sectionHeading}>
            <FileText size={20} color="#00876F" />
            <h2 className={styles.h2}>{t("description")}</h2>
          </div>
          <p className={styles.prose}>{product.description}</p>
        </section>
      ) : null}

      {product.indications.length ? (
        <section className={`${styles.block} ${styles.indicationsBlock}`}>
          <div className={styles.sectionHeading}>
            <Sparkles size={20} color="#00876F" />
            <h2 className={`${styles.h2} ${styles.highlightHeading}`}>{t("indications")}</h2>
          </div>
          <ul className={styles.list}>
            {product.indications.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {product.dosage_instructions ? (
        <section className={`${styles.block} ${styles.dosageBlock}`}>
          <div className={styles.sectionHeading}>
            <Info size={20} color="#2563EB" />
            <h2 className={`${styles.h2} ${styles.dosageHeading}`}>{t("dosage")}</h2>
          </div>
          <p className={styles.prose}>{product.dosage_instructions}</p>
        </section>
      ) : null}

      {product.warnings.length ? (
        <section className={`${styles.block} ${styles.warningBlock}`}>
          <div className={styles.sectionHeading}>
            <AlertCircle size={20} color="#DC2626" />
            <h2 className={`${styles.h2} ${styles.warningHeading}`}>{t("warnings")}</h2>
          </div>
          <ul className={styles.list}>
            {product.warnings.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.notice}>
        <ShieldCheck size={20} color="#00876F" />
        <p>{t("disclaimer")}</p>
      </div>

      <Link className={styles.back} href={categoryPath || `/${locale}/c`}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>{product.category ? t("browseCategory").replace("{category}", product.category) : t("backToCatalog")}</span>
      </Link>
    </main>
  );
}
