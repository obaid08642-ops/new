import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Baby, CalendarDays, ChevronLeft } from "lucide-react";
import { VectorMaternity } from "@/components-next/vector-illustrations";
import styles from "../maternity.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function MaternityTrackerPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MaternityTracker");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/maternity/profile", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const list: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/maternity`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <Baby size={15} aria-hidden="true" />
            {t("title")}
          </p>
          <h1>{t("title")}</h1>
          <p>
            {locale === "ar"
              ? "سجل الأحداث اليومية وملاحظات متابعة الحمل وحركات الجنين المسجلة."
              : "Daily event logs and recorded fetal movement observations."}
          </p>
        </div>
        <span className={styles.heroVector}>
          <VectorMaternity size={48} aria-hidden="true" />
        </span>
      </section>

      {list.length === 0 ? (
        <section className={styles.state}>
          <VectorMaternity size={42} aria-hidden="true" />
          <p>{t("empty")}</p>
        </section>
      ) : (
        <section className={styles.metricsGrid}>
          {list.map((item: any, i: number) => (
            <article className={styles.metricCard} key={String(item?.id ?? i)}>
              <div className={styles.metricTop}>
                <span>{String(item?.type ?? item?.kind ?? item?.category ?? t("title"))}</span>
                <span className={styles.metricGlyph}>
                  <Baby size={18} aria-hidden="true" />
                </span>
              </div>
              <p className={styles.metricValue}>
                {String(item?.title ?? item?.name ?? item?.id ?? "")}
              </p>
              {item?.created_at ? (
                <p className={styles.metricSub}>
                  <CalendarDays size={14} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 4 }} />
                  {String(item.created_at).slice(0, 10)}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
