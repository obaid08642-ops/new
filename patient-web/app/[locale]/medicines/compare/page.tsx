import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
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

  // بيانات حقيقية فقط من كتالوج الأدوية — لا مقارنة مُختلقة
  const items: Array<Record<string, unknown>> = [];
  for (const id of list) {
    const res = await callPatientApi(`/medicines/${encodeURIComponent(id)}?locale=${locale}`, { cache: "no-store" } as RequestInit);
    if (res.ok) { const d = await res.json().catch(() => null); const m = d?.data ?? d; if (m && typeof m === "object") items.push(m as Record<string, unknown>); }
  }

  const value = (m: Record<string, unknown>, field: string) => {
    const v = m[field];
    if (v === null || v === undefined || v === "") return null;
    return field === "price" && typeof v === "number" ? formatPrice(locale, v).text : String(v);
  };
  // a row that no medicine has data for is not drawn
  const fields = (["active_ingredient", "price", "dosage_form", "manufacturer"] as const).filter((f) => items.some((m) => value(m, f) !== null));
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
                  {items.map((m, i) => <th scope="col" key={i}>{String(m.name ?? m.title ?? `#${i + 1}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f}>
                    <th scope="row">{t(f)}</th>
                    {items.map((m, i) => <td key={i}>{value(m, f) ?? "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CoreShell>
  );
}
