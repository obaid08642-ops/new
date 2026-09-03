import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseMedicineSearch } from "@/lib/api/medicines";
import { patientApiUrl } from "@/lib/api/upstream";
import { cdnImage, cleanProductName } from "@/lib/api/public-products-server";
import { JsonLd } from "@/components-next/json-ld";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { RetryButton } from "@/components-next/retry-button";
import { ArrowUpLeft, Pill, Search, ShieldCheck } from "lucide-react";
import styles from "./medicine-catalog.module.css";

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

export default async function PublicMedicineCatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  setRequestLocale(locale);
  const t = await getTranslations("PublicMedicines");
  const search = parseMedicineSearch(await searchParams);
  const result = await searchPublicProducts(locale, search.q, search.page);
  if (!result) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const medicines = result.items;
  const canonical = localizedUrl(locale, "/medicine-catalog");
  const itemList = medicines.map((medicine, index) => ({ "@type": "ListItem", position: index + 1, url: localizedUrl(locale, `/p/${encodeURIComponent(medicine.slug)}`), name: medicine.name || t("untitled") }));

  return <main className={`main ${styles.page}`}>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "ItemList", itemListElement: itemList } }} />
    <section className={styles.hero}>
      <div>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("body")}</p>
      </div>
      <span className={styles.heroIcon}><Pill size={27} aria-hidden="true" /></span>
    </section>
    <form className={styles.search} action={`/${locale}/medicine-catalog`} method="get">
      <label className={styles.field}>
        <span>{t("searchLabel")}</span>
        <span className={styles.fieldInput}>
          <Search size={18} aria-hidden="true" />
          <input name="q" maxLength={80} defaultValue={search.q} autoComplete="off" />
        </span>
      </label>
      <button className={`button button-primary ${styles.submit}`} type="submit">
        <Search size={17} aria-hidden="true" />
        {t("search")}
      </button>
    </form>
    {medicines.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><p>{t("empty")}</p></section> : <>
      <section className={styles.grid} aria-label={t("title")}>
        {medicines.map((medicine) => (
          <Link className={styles.card} key={medicine.id} href={`/${locale}/p/${encodeURIComponent(medicine.slug)}`}>
            <span className={styles.cardTop}>
              <span className={styles.medicineIcon}>
                {medicine.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={medicine.image} alt={medicine.name || ""} className={styles.cardImg} />
                ) : (
                  <Pill size={20} aria-hidden="true" />
                )}
              </span>
              <ArrowUpLeft className={styles.openIcon} size={17} aria-hidden="true" />
            </span>
            <strong className={styles.name}>{medicine.name}</strong>
            {medicine.active_ingredient ? <span className={styles.detail}>{medicine.active_ingredient}</span> : null}
            {medicine.form || medicine.strength ? <span className={styles.detail}>{[medicine.form, medicine.strength, medicine.package_size].filter(Boolean).join(" · ")}</span> : null}
            <div className={styles.cardPriceRow}>
              <strong className={styles.cardPrice}>{medicine.price.toFixed(2)} {medicine.currency}</strong>
              {medicine.is_rx === true ? <span className={styles.prescription}><ShieldCheck size={13} aria-hidden="true" />{t("prescriptionRequired")}</span> : null}
            </div>
            <span className={styles.open}>{t("open")}<ArrowUpLeft size={14} aria-hidden="true" /></span>
          </Link>
        ))}
      </section>
      {result.total > 24 ? (
        <nav className={styles.pagination} aria-label="Catalog pagination">
          {search.page > 1 ? (
            <Link
              className={styles.pageBtn}
              href={`/${locale}/medicine-catalog?${new URLSearchParams({ ...(search.q ? { q: search.q } : {}), page: String(search.page - 1) }).toString()}`}
            >
              ←
            </Link>
          ) : null}
          <span className={styles.pageInfo}>
            {search.page} / {Math.ceil(result.total / 24)} ({result.total})
          </span>
          {search.page < Math.ceil(result.total / 24) ? (
            <Link
              className={styles.pageBtn}
              href={`/${locale}/medicine-catalog?${new URLSearchParams({ ...(search.q ? { q: search.q } : {}), page: String(search.page + 1) }).toString()}`}
            >
              →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>}
  </main>;
}
