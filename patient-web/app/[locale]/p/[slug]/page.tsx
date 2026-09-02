import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cdnImage, getPublicProduct, type PublicProduct } from "@/lib/api/public-products-server";
import { JsonLd } from "@/components-next/json-ld";
import { ProductCartActions } from "@/components-next/product-cart-actions";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { ChevronLeft, Pill, ShieldCheck } from "lucide-react";
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
  const image = cdnImage(product.image);
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
  const images = product.images.length > 0 ? product.images : [cdnImage(product.image)].filter((u): u is string => Boolean(u));
  const categoryPath = product.category
    ? `/${locale}/c/${encodeURIComponent(product.category)}${product.sub_category ? `/${encodeURIComponent(product.sub_category)}` : ""}`
    : null;

  const jsonLd: Array<Record<string, unknown>> = [
    {
      "@context": "https://schema.org", "@type": "Product",
      name, description: product.description || name, image: images, url: canonical,
      sku: product.sku != null ? String(product.sku) : undefined,
      gtin13: product.barcode && /^\d{13}$/.test(product.barcode) ? product.barcode : undefined,
      brand: product.manufacturer ? { "@type": "Brand", name: product.manufacturer } : undefined,
      category: [product.category, product.sub_category, product.sub_sub_category].filter(Boolean).join(" › ") || undefined,
      inLanguage: locale,
      offers: {
        "@type": "Offer", price: product.price, priceCurrency: "SAR", url: canonical,
        availability: product.available ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
        itemCondition: "https://schema.org/NewCondition",
      },
    },
    {
      "@context": "https://schema.org", "@type": "MedicalDrug",
      name, alternateName: product.official_name !== name ? product.official_name : undefined,
      activeIngredient: product.active_ingredient || undefined,
      dosageForm: product.form || undefined, strength: product.strength || undefined,
      prescriptionStatus: product.is_rx ? "https://schema.org/PrescriptionOnly" : "https://schema.org/OTC",
      url: canonical, image: images[0],
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("home"), item: localizedUrl(locale) },
        { "@type": "ListItem", position: 2, name: t("products"), item: localizedUrl(locale, "/c") },
        ...(product.category ? [{ "@type": "ListItem", position: 3, name: product.category, item: `${siteOrigin()}${categoryPath}` }] : []),
        { "@type": "ListItem", position: product.category ? 4 : 3, name, item: canonical },
      ],
    },
    ...(product.indications.length || product.warnings.length ? [{
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: [
        ...(product.indications.length ? [{ "@type": "Question", name: `${t("indications")} — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.indications.join(" ") } }] : []),
        ...(product.warnings.length ? [{ "@type": "Question", name: `${t("warnings")} — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.warnings.join(" ") } }] : []),
      ],
    }] : []),
  ];

  const availabilityLabel = product.available ? t("available") : t("limited");

  return <main className={`main ${styles.page}`}>
    <JsonLd data={jsonLd} />
    <nav className={styles.crumbs} aria-label="breadcrumb">
      <Link href={`/${locale}`}>{t("home")}</Link>
      <span aria-hidden="true">/</span>
      <Link href={`/${locale}/c`}>{t("products")}</Link>
      {product.category && categoryPath ? <>
        <span aria-hidden="true">/</span>
        <Link href={categoryPath}>{product.category}</Link>
      </> : null}
      <span aria-hidden="true">/</span>
      <span aria-current="page">{name}</span>
    </nav>

    <section className={styles.hero}>
      <div className={styles.heroMedia}>
        {images[0]
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={images[0]} alt={name} width={320} height={320} fetchPriority="high" decoding="async" className={styles.heroImg} />
          : <span className={styles.heroIcon}><Pill size={44} aria-hidden="true" /></span>}
        {product.has_discount ? <span className={styles.badge}>{t("discount").replace("{percent}", String(product.discount_percent))}</span> : null}
      </div>
      <div className={styles.heroText}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{product.is_rx ? t("rxRequired") : t("otc")} · {availabilityLabel}</p>
        <h1>{name}</h1>
        <p className={styles.priceRow}>
          <strong className={styles.price}>{product.price.toFixed(2)} {product.currency}</strong>
          {product.old_price && product.old_price > product.price ? <s className={styles.oldPrice}>{product.old_price.toFixed(2)} {product.currency}</s> : null}
        </p>
        <p className={styles.subline}>{[product.form, product.strength, product.package_size].filter(Boolean).join(" · ")}</p>

        {/* Add to Cart Actions */}
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
    </section>

    {images.length > 1 ? <section className={styles.gallery} aria-label={name}>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt={`${name} ${i + 1}`} width={96} height={96} loading="lazy" decoding="async" />
      ))}
    </section> : null}

    <section className={styles.detail} aria-label={t("facts")}>
      <h2 className={styles.h2}>{t("facts")}</h2>
      <dl className={styles.grid}>
        {facts(product, t).map(([label, value]) => <div className={styles.item} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>

    {product.description ? <section className={styles.block}><h2 className={styles.h2}>{t("description")}</h2><p className={styles.prose}>{product.description}</p></section> : null}
    {product.indications.length ? <section className={styles.block}><h2 className={styles.h2}>{t("indications")}</h2><ul className={styles.list}>{product.indications.map((x, i) => <li key={i}>{x}</li>)}</ul></section> : null}
    {product.dosage_instructions ? <section className={styles.block}><h2 className={styles.h2}>{t("dosage")}</h2><p className={styles.prose}>{product.dosage_instructions}</p></section> : null}
    {product.how_to_use.length ? <section className={styles.block}><h2 className={styles.h2}>{t("howToUse")}</h2><ol className={styles.list}>{product.how_to_use.map((x, i) => <li key={i}>{x}</li>)}</ol></section> : null}
    {product.side_effects.length ? <section className={styles.block}><h2 className={styles.h2}>{t("sideEffects")}</h2><ul className={styles.list}>{product.side_effects.map((x, i) => <li key={i}>{x}</li>)}</ul></section> : null}
    {product.warnings.length ? <section className={styles.block}><h2 className={styles.h2}>{t("warnings")}</h2><ul className={styles.list}>{product.warnings.map((x, i) => <li key={i}>{x}</li>)}</ul></section> : null}
    {product.storage_conditions ? <section className={styles.block}><h2 className={styles.h2}>{t("storage")}</h2><p className={styles.prose}>{product.storage_conditions}</p></section> : null}
    {product.brand_benefits ? <section className={styles.block}><h2 className={styles.h2}>{t("brandBenefits")}</h2><p className={styles.prose}>{product.brand_benefits}</p></section> : null}

    <p className={styles.notice}>{t("disclaimer")}</p>
    <Link className={styles.back} href={categoryPath || `/${locale}/c`}><ChevronLeft size={17} aria-hidden="true" />{product.category ? t("browseCategory").replace("{category}", product.category) : t("backToCatalog")}</Link>
  </main>;
}
