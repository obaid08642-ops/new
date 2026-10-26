import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { fallbackMark, fallbackNoteKey, type FallbackMark } from "@/lib/content-language";
import { cdnImage, getPublicEquivalents, getPublicVariants, readPublicProduct, type PublicProduct, type PublicProductCard } from "@/lib/api/public-products-server";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { JsonLd } from "@/components-next/json-ld";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { howToJsonLd } from "@/lib/seo/json-ld";
import { DirectAnswer, speakableSpec } from "@/components-next/seo/direct-answer";
import { CoreShell } from "@/components-next/core/core-shell";
import { StickyFooter } from "@/components-next/ui-generated/shells/StickyFooter";
import { Card } from "@/components-next/ui-generated/components/Surfaces";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { CatalogSearch } from "@/components-next/pharmacy/catalog-search";
import { ChipLink } from "@/components-next/pharmacy/chip-link";
import { BuyActions, BuyBar, BuyPrice, BuyProvider, type BuyVariant } from "@/components-next/pharmacy/product-buy";
import { VariantGallery, VariantPicker } from "@/components-next/pharmacy/variant-picker";
import { ProductGallery } from "@/components-next/pharmacy/product-gallery";
import { ProductShare } from "@/components-next/pharmacy/product-share";
import { SuggestChange } from "@/components-next/pharmacy/suggest-change";
import { ProductViewBeacon } from "@/components-next/pharmacy/product-view-beacon";
import { ProductGrid, type GridProduct } from "@/components-next/pharmacy/product-grid";
import { productCardImageSrc } from "@/components-next/pharmacy/catalog-image";
import { promoOldPrice, promoPercent } from "@/lib/discount";
import { formatNumber, formatPrice } from "@/lib/format-price";
import { ProductSections, type DetailGroup, type DetailSection } from "@/components-next/pharmacy/product-sections";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { englishNameUnder } from "@/lib/english-name-under";
import styles from "@/components-next/pharmacy/product-detail.module.css";

type Props = { params: Promise<{ locale: string; slug: string }> };

// F82-3: static/ISR. The page is made of public data only (no cookie, no header, no search parameter): the same HTML for
// everyone, generated on the first request for a slug, kept for the window of the product read (lib/api/public-products-server.ts,
// one hour) and regenerated in the background. A product that does not exist is a 404; a failed read throws, so Next keeps the
// last good copy (stale-if-error, #302) instead of caching a not-found or an error. What the visitor can do (the buy bar, the
// cart) lives in client components that read the device's own cart, so nothing here depends on who is looking.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

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
  const read = await readPublicProduct(locale, slug);
  if (read.failed) throw new PublicDataUnavailableError("product");
  const product = read.data;
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
    // An item published on the site but not (yet) cleared for search engines is shown to patients with noindex.
    robots: product.indexable === false ? { index: false, follow: true } : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    openGraph: {
      title: name, description, url: canonical, type: "website", siteName: "Nabd Plus",
      locale: locale === "ar" ? "ar_SA" : locale,
      images: image ? [{ url: image, alt: name }] : undefined,
    },
    twitter: { card: "summary_large_image", title: name, description, images: image ? [image] : undefined },
  };
}

/** schema.org DrugStrength from a catalogue strength like "500 mg" (nothing when it does not parse). */
function drugStrength(strength?: string | null) {
  const m = (strength || "").trim().match(/^(\d+(?:[.,]\d+)?)\s*([^\d\s].*)$/);
  return m ? { "@type": "DrugStrength", strengthValue: Number(m[1].replace(",", ".")), strengthUnit: m[2].trim() } : undefined;
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
  const seo = await getTranslations("SeoAnswer");
  const read = await readPublicProduct(locale, slug);
  // a failed read (no answer, or a 5xx) throws, so Next keeps the last good copy of this page (stale-if-error, #302)
  if (read.failed) throw new PublicDataUnavailableError("product");
  const fetchedProduct = read.data;
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

  const howTo = howToJsonLd(product, seo("howToTitle", { name }));
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
      speakable: speakableSpec,
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
    // schema.org Drug (MedicalDrug is not a schema.org type): only properties Drug defines, from catalogue fields.
    {
      "@context": "https://schema.org",
      "@type": "Drug",
      name,
      alternateName: product.official_name !== name ? product.official_name : undefined,
      activeIngredient: product.active_ingredient || undefined,
      dosageForm: product.form || undefined,
      availableStrength: drugStrength(product.strength),
      prescriptionStatus: product.is_rx ? "https://schema.org/PrescriptionOnly" : "https://schema.org/OTC",
      warning: product.warnings?.length ? product.warnings.join(" ") : undefined,
      indication: product.indications?.length ? product.indications.map((text) => ({ "@type": "MedicalIndication", name: text })) : undefined,
      manufacturer: product.manufacturer ? { "@type": "Organization", name: product.manufacturer } : undefined,
      url: canonical,
      image: images[0],
      inLanguage: locale,
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
        ...(product.side_effects?.length ? [{ "@type": "Question", name: `${t("sideEffects")} — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.side_effects.join(" ") } }] : []),
        ...(product.storage_conditions ? [{ "@type": "Question", name: `${t("storage")} — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.storage_conditions } }] : []),
        ...(product.dosage_instructions ? [{ "@type": "Question", name: `${t("dosage")} — ${name}`, acceptedAnswer: { "@type": "Answer", text: product.dosage_instructions } }] : []),
      ],
    }] : []),
    ...(howTo ? [howTo] : []),
  ];

  // What the buy card may offer: a price from the API, and a product that is still sold.
  const hasPrice = product.price > 0;
  const discontinued = product.availability_status === "discontinued";
  const canBuy = hasPrice && !discontinued;
  // Decision 10: no discount, crossed-out price or promo badge on prescription-only items (canShowPromo, via promoPercent).
  const percent = promoPercent(product, product.price, product.old_price);
  const crossedPrice = promoOldPrice(product, product.price, product.old_price);
  const money = formatPrice(locale, product.price);

  // Decision D (issue 1556): the product's variants (powers, colours, shades), each its own record with its own SKU and price.
  const variants: BuyVariant[] = (await getPublicVariants(locale, product)).map((v) => ({
    id: v.id, sku: v.sku, slug: v.slug, name: v.name || name, price: v.price, image: cdnImage(v.image) || null,
    available: v.available && v.price > 0, power: v.variant.power, colour: v.variant.colour, shade: v.variant.shade, kind: v.variant.kind,
  }));
  const hasVariants = variants.length > 1;

  // Issue 1547: equivalents by the normalized active ingredient (same strength first), or, when there is none, similar
  // products of the same therapeutic class / category. Both empty: no section and no heading.
  const related = await getPublicEquivalents(locale, product.id);
  const toGrid = (alt: PublicProductCard): GridProduct => ({
    id: alt.id,
    slug: alt.slug,
    name: alt.name || alt.slug,
    price: alt.price,
    oldPrice: alt.old_price,
    image: alt.image,
    thumb: productCardImageSrc(alt.image),
    form: alt.form,
    strength: alt.strength,
    packageSize: alt.package_size,
    rx: alt.is_rx,
    onlineOnly: alt.online_exclusive === true,
    // "cheaper" is computed here, from the two real prices (spec A, "Alternatives")
    badge: alt.price > 0 && hasPrice && alt.price < product.price ? b("cheaper") : undefined,
  });
  const alternatives = related.equivalents.map(toGrid);
  const similar = related.similar.map(toGrid);

  // A section the API had to take from another language says so: lang/dir on its text and a note in the reader's language.
  const section = (id: string, title: string, items: string[], field?: string): DetailSection | null => {
    if (!items.length) return null;
    const mark = field ? fallbackMark(product.fallback_langs, field, locale) : null;
    const noteKey = mark ? fallbackNoteKey(mark.lang) : null;
    return mark && noteKey ? { id, title, items, lang: mark.lang, dir: mark.dir, note: t(noteKey) } : { id, title, items };
  };
  const group = (id: string, title: string, parts: Array<DetailSection | null>): DetailGroup | null => {
    const sections = parts.filter((p): p is DetailSection => p !== null);
    return sections.length ? { id, title, sections } : null;
  };
  const groups = [
    group("usage", b("groupUsage"), [
      section("description", t("description"), lines(product.description), "description"),
      section("indications", t("indications"), product.indications || [], "indications"),
      section("dosage", t("dosage"), lines(product.dosage_instructions), "dosage_instructions"),
      section("howToUse", t("howToUse"), product.how_to_use || [], "how_to_use"),
    ]),
    // issue 1819: the active ingredients recorded as interacting with this product (leaflet information, as stored)
    group("warnings", t("warnings"), [section("warnings", t("warnings"), product.warnings || [], "warnings"), section("interactions", t("interactions"), product.interactions || [])]),
    group("sideEffects", t("sideEffects"), [section("sideEffects", t("sideEffects"), product.side_effects || [], "side_effects")]),
    group("more", b("groupMore"), [
      section("storage", t("storage"), lines(product.storage_conditions), "storage_conditions"),
      section("packageContent", t("packageContent"), lines(product.package_content_details), "package_content_details"),
      section("brandBenefits", t("brandBenefits"), lines(product.brand_benefits), "brand_benefits"),
    ]),
  ].filter((g): g is DetailGroup => g !== null);

  const facts: Array<[string, string, FallbackMark | null]> = ([
    [t("form"), product.form, fallbackMark(product.fallback_langs, "form", locale)],
    [t("strength"), product.strength, fallbackMark(product.fallback_langs, "strength", locale)],
    [t("packageSize"), product.package_size || product.package_content_details, fallbackMark(product.fallback_langs, "package_size", locale)],
    [t("manufacturer"), product.manufacturer, null],
    [t("origin"), product.country_of_origin, null],
    [medicines("prescription"), product.is_rx ? medicines("yes") : medicines("no"), null],
  ] as Array<[string, string | null | undefined, FallbackMark | null]>).filter((row): row is [string, string, FallbackMark | null] => Boolean(row[1]));

  // Decision E (issue 1556): ur, hi and bn show the English name under the localized one, so patient and pharmacist read the same product.
  const englishName = englishNameUnder(locale, name, product.english_name);
  const names = lines(product.official_name !== name && product.official_name !== englishName ? product.official_name : null);
  const ingredient = product.active_ingredient ? b("activeIngredientLine", { value: product.active_ingredient }) : null;
  const maker = [product.manufacturer, product.country_of_origin ? b("madeIn", { country: product.country_of_origin }) : null].filter(Boolean).join(" · ");

  return (
    <BuyProvider
      locale={locale}
      variants={hasVariants ? variants : undefined}
      product={{
        id: product.id,
        name,
        price: product.price,
        rx: product.is_rx,
        onlineOnly: product.online_exclusive === true,
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
        footer={canBuy ? <StickyFooter label={b("referencePrice")}><BuyBar locale={locale} /></StickyFooter> : undefined}
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
            {hasVariants ? (
              <VariantGallery name={name} images={images} pageProductId={product.id} locale={locale} badge={percent > 0 ? t("discount", { percent: formatNumber(locale, percent) }) : undefined} />
            ) : (
              <ProductGallery name={name} images={images} itemId={product.id} locale={locale} badge={percent > 0 ? t("discount", { percent: formatNumber(locale, percent) }) : undefined} />
            )}

            <div className={styles.info}>
              <div className={styles.chipsRow}>
                <StatusChip label={product.is_rx ? t("rxRequired") : t("otc")} tone={product.is_rx ? "amber" : "mint"} />
                <StatusChip label={product.available ? t("available") : discontinued ? t("unavailable") : t("limited")} tone={product.available ? "mint" : "amber"} />
                {product.online_exclusive === true ? <StatusChip label={t("onlineOnly")} tone="mint" /> : null}
                {product.cold_chain === true ? <StatusChip label={t("coldChain")} tone="blue" /> : null}
                <ProductShare name={name} url={canonical} />
              </div>
              {product.category && categoryPath ? (
                <div className={styles.catChips}>
                  <ChipLink href={categoryPath} label={[product.category, product.sub_category].filter(Boolean).join(" › ")} />
                </div>
              ) : null}

              <div className={styles.names}>
                <h1 className={styles.title}>{name}</h1>
                {englishName ? <p className={styles.englishName} lang="en" dir="ltr" data-testid="english-name">{englishName}</p> : null}
                <DirectAnswer sentences={[
                  product.active_ingredient ? seo("productIngredient", { name, ingredient: product.active_ingredient }) : null,
                  product.form ? seo("productForm", { form: product.form }) : null,
                  product.strength ? seo("productStrength", { strength: product.strength }) : null,
                  product.is_rx ? seo("productRx") : seo("productOtc"),
                  hasPrice ? seo("productPrice", { price: money.text }) : null,
                ]} />
                {names.map((n) => <div key={n} className={styles.altName} dir="auto">{n}</div>)}
                {ingredient ? <div className={styles.maker}>{ingredient}</div> : null}
                {maker ? <div className={styles.maker}>{maker}</div> : null}
              </div>

              <Card elevation="card" padding="lg">
                {hasVariants ? <VariantPicker locale={locale} /> : null}
                {hasPrice && hasVariants ? (
                  <div className={styles.priceBlock}>
                    {/* each variant has its own price: drawn for the chosen one (no crossed-out price across variants) */}
                    <BuyPrice locale={locale} className={styles.priceRow} amountClassName={styles.price} currencyClassName={styles.currency} />
                    <div className={styles.priceNote}>{b("taxIncluded")}</div>
                  </div>
                ) : hasPrice ? (
                  <div className={styles.priceBlock}>
                    <div className={styles.priceRow}>
                      <strong className={styles.price}>{money.amount}</strong>
                      <span className={styles.currency}>{money.currency}</span>
                      {crossedPrice ? (
                        <s className={styles.oldPrice}>{formatPrice(locale, crossedPrice).text}</s>
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
                    {facts.map(([label, value, mark]) => (
                      <div className={styles.fact} key={label}>
                        <dt className={styles.factLabel}>{label}</dt>
                        <dd className={styles.factValue} lang={mark?.lang} dir={mark?.dir}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
            </div>

            {alternatives.length ? (
              <section className={`${styles.block} ${styles.alts}`} aria-label={b("alternativesTitle")} data-testid="product-equivalents">
                <div className={styles.blockHead}>
                  <h2 className={styles.blockTitle}>{b("alternativesTitle")}</h2>
                  {/* batch-1a-web#8: compare this medicine with its alternatives (POST /medicines/compare, as the app) */}
                  <Link className={styles.blockLink} href={`/${locale}/medicines/compare?ids=${[product.id, ...alternatives.map((a) => a.id)].slice(0, 4).map(encodeURIComponent).join(",")}`}>{b("compareAlternatives")}</Link>
                  {product.active_ingredient ? (
                    <Link className={styles.blockLink} href={`/${locale}/c?q=${encodeURIComponent(product.active_ingredient)}`}>{b("seeAll")}</Link>
                  ) : null}
                </div>
                <ProductGrid locale={locale} items={alternatives} layout="rail" />
              </section>
            ) : similar.length ? (
              <section className={`${styles.block} ${styles.alts}`} aria-label={b("similarTitle")} data-testid="product-similar">
                <div className={styles.blockHead}>
                  <h2 className={styles.blockTitle}>{b("similarTitle")}</h2>
                  {categoryPath ? <Link className={styles.blockLink} href={categoryPath}>{b("seeAll")}</Link> : null}
                </div>
                <ProductGrid locale={locale} items={similar} layout="rail" />
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

          <SuggestChange medicineId={product.id} locale={locale} />
          <ProductViewBeacon medicineId={product.id} />
        </div>
      </CoreShell>
    </BuyProvider>
  );
}
