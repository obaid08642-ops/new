import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FileClock, ChevronLeft, CalendarDays } from "lucide-react";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import styles from "../health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthTimelinePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthTimeline");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/medical-reports/timeline", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const list: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.events) ? payload.events : Array.isArray(payload) ? payload : [];

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/health`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <FileClock size={15} aria-hidden="true" />
            {t("title")}
          </p>
          <h1>{t("title")}</h1>
        </div>
        <span className={styles.heroVector}>
          <VectorHealthShield size={48} aria-hidden="true" />
        </span>
      </section>
      {list.length === 0 ? (
        <section className={styles.state}>
          <VectorHealthShield size={42} aria-hidden="true" />
          <p>{t("empty")}</p>
        </section>
      ) : (
        <section className={styles.grid}>
          {list.map((item: any, i: number) => (
            <article className={styles.card} key={String(item?.id ?? i)}>
              <div className={styles.cardTop}>
                <span className={styles.glyph}>
                  <FileClock size={17} aria-hidden="true" />
                </span>
                <span>{String(item?.category ?? item?.source ?? "")}</span>
              </div>
              <p className={styles.value}>{String(item?.title ?? item?.type ?? item?.kind ?? "")}</p>
              {item?.created_at || item?.date ? (
                <p className={styles.date}>
                  <CalendarDays size={14} aria-hidden="true" />
                  {String(item?.created_at ?? item?.date ?? "").slice(0, 16)}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
