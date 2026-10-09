import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cdnImage, getPublicAlternatives, getPublicProduct, type PublicProduct } from "@/lib/api/public-products-server";
import { JsonLd } from "@/components-next/json-ld";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { howToJsonLd, speakable } from "@/lib/seo/json-ld";
import { CiteThis } from "@/components-next/cite-this";
import { CoreShell } from "@/components-next/core/core-shell";
import { StickyFooter } from "@/components-next/ui-generated/shells/StickyFooter";
import { Card } from "@/components-next/ui-generated/components/Surfaces";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { CatalogSearch } from "@/components-next/pharmacy/catalog-search";
import { ChipLink } from "@/components-next/pharmacy/chip-link";
import { BuyActions, BuyBar, BuyProvider } from "@/components-next/pharmacy/product-buy";
import { ProductGallery } from "@/components-next/pharmacy/product-gallery";
import { ProductGrid, type GridProduct } from "@/components-next/pharmacy/product-grid";
import { discountPercent } from "@/lib/discount";
import { formatNumber, formatPrice } from "@/lib/format-price";
import { ProductSections, type DetailGroup, type DetailSection } from "@/components-next/pharmacy/product-sections";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import styles from "@/components-next/pharmacy/product-detail.module.css";

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

/** A long text field of the API as the lines it is written in (an empty field gives none, so no section is drawn). */
const lines = (value?: string | null) => (value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);

export default async function PublicProductPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("PublicProduct");
  const b = await getTranslations("PharmacyBrowse");
  const shared = await getTranslations("Shared");
  const medicines = await getTranslations("Medicines");
  const fetchedProduct = await getPublicProduct(locale, slug);
  if (!fetchedProduct) notFound();
  const product: PublicProduct = fetchedProduct;
  const name = product.name || product.official_name || t("products");
  const canonical = localizedUrl(locale, `/p/${encodeURIComponent(product.slug)}`);
  const rawImages = (product.images && product.images.length > 0 ? product.images : [product.image]).filter((u): u is string => Boolean(u));
  // No stock photo stands in for a missing picture: the gallery draws the category's icon instead (spec A, "Gallery").
  const images = rawImages.map((u) => cdnImage(u) || u).filter(Boolean);
  const categoryPath = product.category
    ? `/${locale}/c/${encodeURIComponent(product.category)}${product.sub_category ? `/${encodeURIComponent(product.sub_category)}` : ""}`
    : null;

  const howTo = howToJsonLd(product);
  const jsonLd: Array<Record<string, unknown>> = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      alternateName: product.official_name !== name ? product.official_name : undefined,
      description: product.description || name,
      image: images.length ? images : undefined,
      url: canonical,
      sku: product.sku != null ? String(product.sku) : undefined,
      gtin13: product.barcode && /^\d{13}$/.test(product.barcode) ? product.barcode : undefined,
      brand: product.manufacturer ? { "@type": "Brand", name: product.manufacturer } : undefined,
      manufacturer: product.manufacturer ? { "@type": "Organization", name: product.manufacturer } : undefined,
      category: [product.category, product.sub_category, product.sub_sub_category].filter(Boolean).join(" › ") || undefined,
      additionalProperty: [
        product.package_size ? { "@type": "PropertyValue", name: "package_size", value: product.package_size } : null,
        product.package_content_details ? { "@type": "PropertyValue", name: "package_content", value: product.package_content_details } : null,
        product.country_of_origin ? { "@type": "PropertyValue", name: "country_of_origin", value: product.country_of_origin } : null,
        product.active_ingredient ? { "@type": "PropertyValue", name: "active_ingredient", value: product.active_ingredient } : null,
        product.strength ? { "@type": "PropertyValue", name: "strength", value: product.strength } : null,
        product.form ? { "@type": "PropertyValue", name: "form", value: product.form } : null,
      ].filter(Boolean) as any,
      inLanguage: locale,
      isAccessibleForFree: true,
      isFamilyFriendly: true,
      speakable: speakable,
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: product.currency || "SAR",
        url: canonical,
        availability: product.available ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
        itemCondition: "https://schema.org/NewCondition",
        seller: {
          "@type": "Organization",
          name: "Nabd Plus",
          url: "https://nabd.plus",
        },
        // Needs-review #471: no shipping rate, return policy or price expiry is published until the backend provides them.
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "MedicalDrug",
      name,
      alternateName: product.official_name !== name ? product.official_name : undefined,
      activeIngredient: product.active_ingredient || undefined,
      dosageForm: product.form || undefined,
      strength: product.strength || undefined,
      prescriptionStatus: product.is_rx ? "https://schema.org/PrescriptionOnly" : "https://schema.org/OTC",
      contraindication: product.warnings?.join(" ") || undefined,
      adverseOutcome: product.side_effects?.join(" ") || undefined,
      indication: product.indications?.join(" ") || undefined,
      dosageInstructions: product.dosage_instructions || undefined,
      storageConditions: product.storage_conditions || undefined,
      url: canonical,
      image: images[0],
      speakable: speakable,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("home"), item: localizedUrl(locale) },
        { "@type": "ListItem", position: 2, name: t("products"), item: localizedUrl(locale, "/c") },
        ...(product.category ? [{ "@type": "ListItem", position: 3, name: product.category, item: `${siteOrigin()}${categoryPath}` }] : []),
        { "@type": "ListItem", position: product.category ? 4 : 3, name, item: canonical },
      ],
    },
    ...((product.indications?.length || product.warnings?.length || product.side_effects?.length || product.storage_conditions) ? [{
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        ...(product.indications?.length ? [{ "@type": "Question", name: `${t("indications")} — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.indications.join(" ") } }] : []),
        ...(product.warnings?.length ? [{ "@type": "Question", name: `${t("warnings")} — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.warnings.join(" ") } }] : []),
        ...(product.side_effects?.length ? [{ "@type": "Question", name: `الآثار الجانبية — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.side_effects.join(" ") } }] : []),
        ...(product.storage_conditions ? [{ "@type": "Question", name: `التخزين — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.storage_conditions } }] : []),
        ...(product.dosage_instructions ? [{ "@type": "Question", name: `الجرعة — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.dosage_instructions } }] : []),
      ],
    }] : []),
    ...(howTo ? [howTo] : []),
  ];

  // What the buy card may offer: a price from the API, and a product that is still sold.
  const hasPrice = product.price > 0;
  const discontinued = product.availability_status === "discontinued";
  const canBuy = hasPrice && !discontinued;
  // Decision 10: no discount on prescription-only items.
  const percent = product.is_rx ? 0 : discountPercent(product.price, product.old_price);
  const money = formatPrice(locale, product.price);

  const alternatives: GridProduct[] = (await getPublicAlternatives(locale, product)).map((alt) => ({
    id: alt.id,
    slug: alt.slug,
    name: alt.name || alt.slug,
    price: alt.price,
    oldPrice: alt.old_price,
    image: alt.image,
    form: alt.form,
    strength: alt.strength,
    packageSize: alt.package_size,
    rx: alt.is_rx,
    // "cheaper" is computed here, from the two real prices (spec A, "Alternatives")
    badge: alt.price > 0 && hasPrice && alt.price < product.price ? b("cheaper") : undefined,
  }));

  const section = (id: string, title: string, items: string[]): DetailSection | null => (items.length ? { id, title, items } : null);
  const group = (id: string, title: string, parts: Array<DetailSection | null>): DetailGroup | null => {
    const sections = parts.filter((p): p is DetailSection => p !== null);
    return sections.length ? { id, title, sections } : null;
  };
  const groups = [
    group("usage", b("groupUsage"), [
      section("description", t("description"), lines(product.description)),
      section("indications", t("indications"), product.indications || []),
      section("dosage", t("dosage"), lines(product.dosage_instructions)),
      section("howToUse", t("howToUse"), product.how_to_use || []),
    ]),
    group("warnings", t("warnings"), [section("warnings", t("warnings"), product.warnings || [])]),
    group("sideEffects", t("sideEffects"), [section("sideEffects", t("sideEffects"), product.side_effects || [])]),
    group("more", b("groupMore"), [
      section("storage", t("storage"), lines(product.storage_conditions)),
      section("packageContent", t("packageContent"), lines(product.package_content_details)),
      section("brandBenefits", t("brandBenefits"), lines(product.brand_benefits)),
    ]),
  ].filter((g): g is DetailGroup => g !== null);

  const facts: Array<[string, string]> = ([
    [t("form"), product.form],
    [t("strength"), product.strength],
    [t("packageSize"), product.package_size || product.package_content_details],
    [t("manufacturer"), product.manufacturer],
    [t("origin"), product.country_of_origin],
    [medicines("prescription"), product.is_rx ? medicines("yes") : medicines("no")],
  ] as Array<[string, string | null | undefined]>).filter((row): row is [string, string] => Boolean(row[1]));

  const names = lines(product.official_name !== name ? product.official_name : null);
  const ingredient = product.active_ingredient ? b("activeIngredientLine", { value: product.active_ingredient }) : null;
  const maker = [product.manufacturer, product.country_of_origin ? b("madeIn", { country: product.country_of_origin }) : null].filter(Boolean).join(" · ");

  return (
    <BuyProvider
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
    >
      <CoreShell
        locale={locale}
        backHref={categoryPath || `/${locale}/c`}
        hideTabs
        topBarSearch={<CatalogSearch locale={locale} tools={false} />}
        footer={canBuy ? <StickyFooter label={b("total")}><BuyBar locale={locale} /></StickyFooter> : undefined}
      >
        <div className={styles.page}>
          <JsonLd data={jsonLd} />
          {/* F82-1: the gallery's CatalogImage (priority) emits the one correct preload, for the rendition shown. */}

          <nav className={styles.crumbs} aria-label={b("breadcrumb")}>
            <ol>
              <li><Link href={`/${locale}/c`}>{shared("navPharmacy")}</Link></li>
              {product.category && categoryPath ? (
                <>
                  <li aria-hidden="true" className={styles.crumbSep}>›</li>
                  <li><Link href={`/${locale}/c/${encodeURIComponent(product.category)}`}>{product.category}</Link></li>
                </>
              ) : null}
              {product.category && product.sub_category ? (
                <>
                  <li aria-hidden="true" className={styles.crumbSep}>›</li>
                  <li><Link href={categoryPath!}>{product.sub_category}</Link></li>
                </>
              ) : null}
              <li aria-hidden="true" className={styles.crumbSep}>›</li>
              <li aria-current="page">{name}</li>
            </ol>
          </nav>

          <section className={styles.hero}>
            <ProductGallery name={name} images={images} itemId={product.id} locale={locale} badge={percent > 0 ? t("discount", { percent: formatNumber(locale, percent) }) : undefined} />

            <div className={styles.info}>
              <div className={styles.chipsRow}>
                <StatusChip label={product.is_rx ? t("rxRequired") : t("otc")} tone={product.is_rx ? "amber" : "mint"} />
                <StatusChip label={product.available ? t("available") : discontinued ? t("unavailable") : t("limited")} tone={product.available ? "mint" : "amber"} />
              </div>
              {product.category && categoryPath ? (
                <div className={styles.catChips}>
                  <ChipLink href={categoryPath} label={[product.category, product.sub_category].filter(Boolean).join(" › ")} />
                </div>
              ) : null}

              <div className={styles.names}>
                <h1 className={styles.title}>{name}</h1>
                {names.map((n) => <div key={n} className={styles.altName} dir="auto">{n}</div>)}
                {ingredient ? <div className={styles.maker}>{ingredient}</div> : null}
                {maker ? <div className={styles.maker}>{maker}</div> : null}
              </div>

              <Card elevation="card" padding="lg">
                {hasPrice ? (
                  <div className={styles.priceBlock}>
                    <div className={styles.priceRow}>
                      <strong className={styles.price}>{money.amount}</strong>
                      <span className={styles.currency}>{money.currency}</span>
                      {!product.is_rx && product.old_price && product.old_price > product.price ? (
                        <s className={styles.oldPrice}>{formatPrice(locale, product.old_price).text}</s>
                      ) : null}
                    </div>
                    <div className={styles.priceNote}>{[b("taxIncluded"), product.package_size].filter(Boolean).join(" · ")}</div>
                  </div>
                ) : (
                  <p className={styles.noPrice}>{b("priceUnavailable")}</p>
                )}

                {!product.available ? (
                  <div className={styles.banner} role="note">
                    <FIcon icon="warning" tone="amber" chip="none" size={24} />
                    <p className={styles.bannerTitle}>{discontinued ? b("discontinuedTitle") : b("shortageTitle")}</p>
                  </div>
                ) : null}

                {product.is_rx ? (
                  <div className={styles.rxCard}>
                    <FIcon icon="prescription" tone={PHARMACY_TONE} size={44} />
                    <div className={styles.rxBody}>
                      <p className={styles.rxTitle}>{b("rxCardTitle")}</p>
                      <p className={styles.rxText}>{b("rxCardBody")}</p>
                      <Link className={styles.rxLink} href={`/${locale}/pharmacy/rx-order?via=photo`}>{b("rxCardAction")}</Link>
                    </div>
                  </div>
                ) : null}

                {canBuy ? <BuyActions locale={locale} /> : null}
              </Card>
            </div>
          </section>

          <div className={styles.below}>
            <div className={styles.side}>
              {facts.length ? (
                <section className={styles.factsBlock} aria-label={t("facts")}>
                  <h2 className={styles.blockTitle}>{t("facts")}</h2>
                  <dl className={styles.factsList}>
                    {facts.map(([label, value]) => (
                      <div className={styles.fact} key={label}>
                        <dt className={styles.factLabel}>{label}</dt>
                        <dd className={styles.factValue}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
              <Link className={styles.ask} href={`/${locale}/pharmacy/chat`}>
                <FIcon icon="chat-circle-text" tone={PHARMACY_TONE} size={52} />
                <span className={styles.askText}>
                  <span className={styles.askTitle}>{b("askTitle")}</span>
                  <span className={styles.askBody}>{b("askBody")}</span>
                </span>
              </Link>
            </div>

            {alternatives.length ? (
              <section className={`${styles.block} ${styles.alts}`} aria-label={b("alternativesTitle")}>
                <div className={styles.blockHead}>
                  <h2 className={styles.blockTitle}>{b("alternativesTitle")}</h2>
                  {product.active_ingredient ? (
                    <Link className={styles.blockLink} href={`/${locale}/c?q=${encodeURIComponent(product.active_ingredient)}`}>{b("seeAll")}</Link>
                  ) : null}
                </div>
                <ProductGrid locale={locale} items={alternatives} layout="rail" />
              </section>
            ) : null}

            <section className={`${styles.block} ${styles.details}`} aria-label={b("detailsTitle")}>
              {groups.length ? (
                <>
                  <h2 className={styles.blockTitle}>{b("detailsTitle")}</h2>
                  <div className={styles.detailsCard}>
                    <ProductSections groups={groups} label={b("detailsTitle")} />
                    <div className={styles.legal}>
                      <p>{t("disclaimer")}</p>
                      <div className={styles.ids}>
                        {product.sku != null ? <span>{t("sku")}: {String(product.sku)}</span> : null}
                        {product.barcode ? <span>{t("barcode")}: <bdi dir="ltr">{product.barcode}</bdi></span> : null}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.legal}>
                  <p>{t("disclaimer")}</p>
                  <div className={styles.ids}>
                    {product.sku != null ? <span>{t("sku")}: {String(product.sku)}</span> : null}
                    {product.barcode ? <span>{t("barcode")}: <bdi dir="ltr">{product.barcode}</bdi></span> : null}
                  </div>
                </div>
              )}
            </section>
          </div>

          <CiteThis
            title={name}
            uri={canonical}
            author={null}
            authorTitle={null}
            publishedAt={null}
            locale={locale}
          />
        </div>
      </CoreShell>
    </BuyProvider>
  );
}
