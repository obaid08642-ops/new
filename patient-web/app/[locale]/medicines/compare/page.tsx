import type { Metadata } from "next";
import { localizedText } from "@/lib/i18n/localized-field";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { resolveProductGallery } from "@/lib/api/public-products-server";
import { CatalogImage } from "@/components-next/pharmacy/catalog-image";
import { CompareAddButton } from "@/components-next/pharmacy/compare-add-button";
import { allowedImageUrl } from "@/lib/image-hosts";
import { getDirection, isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";
import { formatPrice } from "@/lib/format-price";
import { CoreShell } from "@/components-next/core/core-shell";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import styles from "@/components-next/pharmacy/pharmacy.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ids?: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/medicines/compare", t("medicines/compare.title"), t("medicines/compare.description"));
}

export default async function MedicineComparePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { ids = "" } = await searchParams;
  const t = await getTranslations("MedicineCompare");
  const list = ids.split(",").map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_-]{1,64}$/.test(s)).slice(0, 4);

  // Real catalogue rows only, in one call as the app does (POST /medicines/compare, public; only published medicines),
  // kept in the order of the link
  let items: Array<Record<string, unknown>> = [];
  if (list.length >= 2) {
    const res = await callPatientApi("/medicines/compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: list }), cache: "no-store" } as RequestInit);
    const d = res.ok ? await res.json().catch(() => null) : null;
    const rows = (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []) as Array<Record<string, unknown>>;
    items = list.map((id) => rows.find((m) => m && m.id === id)).filter((m): m is Record<string, unknown> => Boolean(m));
  }

  const value = (m: Record<string, unknown>, field: string) => {
    const v = m[field];
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "boolean") return v ? t("yes") : t("no");
    return field === "price" && typeof v === "number" ? formatPrice(locale, v).text : String(v);
  };
  // a row that no medicine has data for is not drawn
  // the catalogue's own field names (medicine.schema: form, strength), not the old guesses (dosage_form)
  const fields = (["active_ingredient", "price", "form", "strength", "manufacturer", "requires_prescription", "online_exclusive"] as const).filter((f) => items.some((m) => value(m, f) !== null));
  // The cheapest price of the compared medicines is marked (parity audit /medicines/compare: the app's "lowest" chip).
  const prices = items.map((m) => (typeof m.price === "number" && m.price > 0 ? m.price : null)).filter((p): p is number => p !== null);
  const cheapest = prices.length >= 2 ? Math.min(...prices) : null;
  const lowest = (await getTranslations("PharmacyOffers"))("lowestPrice");
  const cartLabel = (await getTranslations("CartScreen"))("title");
  const back = `/${locale}/c`;
  const caret = getDirection(locale) === "rtl" ? "caret-right" : "caret-left";

  return (
    <CoreShell locale={locale} title={t("title")} backHref={back}>
      <div className={styles.page}>
        <Link className={`${styles.back}`} href={back}><Icon name={caret} size={16} tone="currentColor" />{t("back")}</Link>
        <div className={styles.head}>
          <h1 className={styles.title}>{t("title")}</h1>
        </div>
        {items.length < 2 ? (
          <div className={styles.state}>
            <EmptyState icon="arrows-left-right" tone="mint" title={t("title")} body={t("emptyBody")} />
            <Link href={back} className={`nabd-button nabd-button--primary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
              <span className="nabd-button__label">{t("browse")}</span>
            </Link>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>{t("title")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("attribute")}</th>
                  {items.map((m, i) => {
                    const name = String(localizedText({ locale, ar: m.name_ar as string | undefined, en: m.name_en as string | undefined }) ?? `#${i + 1}`);
                    const picture = allowedImageUrl(resolveProductGallery(m)[0]);
                    return (
                      <th scope="col" key={i}>
                        <Link className={styles.compareHead} href={`/${locale}/medicines/${encodeURIComponent(String(m.id))}`}>
                          {picture ? <CatalogImage src={picture} alt="" sizes="96px" width={96} height={96} className={styles.compareImage} /> : null}
                          <span>{name}</span>
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f}>
                    <th scope="row">{t(f)}</th>
                    {items.map((m, i) => (
                      <td key={i}>
                        {value(m, f) ?? "—"}
                        {f === "price" && cheapest !== null && m.price === cheapest ? <span className={styles.lowestTag}>{lowest}</span> : null}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row">{cartLabel}</th>
                  {items.map((m, i) => {
                    const name = String(localizedText({ locale, ar: m.name_ar as string | undefined, en: m.name_en as string | undefined }) ?? `#${i + 1}`);
                    return (
                      <td key={i}>
                        <CompareAddButton id={String(m.id)} name={name} rx={m.requires_prescription === true} onlineOnly={m.online_exclusive === true} image={resolveProductGallery(m)[0] ?? null} slug={typeof m.slug === "string" ? m.slug : null} />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CoreShell>
  );
}
