import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { GitCompareArrows, ChevronLeft } from "lucide-react";
import styles from "./compare.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ids?: string }> };

export default async function MedicineComparePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { ids = "" } = await searchParams;
  const t = await getTranslations("MedicineCompare");
  const list = ids.split(",").map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_-]{1,64}$/.test(s)).slice(0, 4);

  // بيانات حقيقية فقط من كتالوج الأدوية — لا مقارنة مُختلقة
  const items: any[] = [];
  for (const id of list) {
    const res = await callPatientApi(`/medicines/${encodeURIComponent(id)}?locale=${locale}`, { cache: "no-store" } as any);
    if (res.ok) { const d = await res.json().catch(() => null); const m = d?.data ?? d; if (m && typeof m === "object") items.push(m); }
  }
  const F = ["name", "active_ingredient", "price", "dosage_form", "manufacturer"] as const;

  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/medicines`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <h1 className={styles.title}><GitCompareArrows size={22} aria-hidden="true" />{t("title")}</h1>
    {items.length < 2 ? (
      <section className={styles.empty}><p>{t("emptyBody")}</p><Link className={styles.primary} href={`/${locale}/medicines`}>{t("browse")}</Link></section>
    ) : (
      <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>{t("attribute")}</th>{items.map((m, i) => <th key={i}>{String(m.name ?? m.title ?? `#${i + 1}`)}</th>)}</tr></thead>
        <tbody>{F.slice(1).map((f) => (
          <tr key={f}><td>{t(f)}</td>{items.map((m, i) => <td key={i}>{m[f] != null ? String(m[f]) : "—"}</td>)}</tr>
        ))}</tbody>
      </table></div>
    )}
  </main>;
}
