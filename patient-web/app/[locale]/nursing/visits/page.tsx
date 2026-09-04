import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { extractNursingVisits } from "@/lib/api/nursing-visits";
import { getPatientNursingVisits } from "@/lib/api/nursing-visits-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorNursing } from "@/components-next/vector-illustrations";
import styles from "./visits.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function NursingVisitsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingVisits");
  const token = await requirePatientAccess(locale);
  const response = await getPatientNursingVisits(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <VectorNursing size={54} aria-hidden="true" />
          <h1>{t("unavailable")}</h1>
          <p>{t("unavailableBody")}</p>
        </section>
      </main>
    );
  }

  const visits = extractNursingVisits(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`} dir={rtl ? "rtl" : "ltr"}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon}>
          <VectorNursing size={52} aria-hidden="true" />
        </span>
      </section>

      {visits.length === 0 ? (
        <section className={styles.state}>
          <CalendarDays size={32} color="#E11D48" aria-hidden="true" />
          <h2>{t("empty")}</h2>
          <Link href={`/${locale}/nursing/catalog`} className={styles.status} style={{ marginTop: 12, padding: "8px 16px", textDecoration: "none" }}>
            {locale === "ar" ? "استعرض خدمات التمريض" : "Browse Nursing Services"}
          </Link>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")}>
          {visits.map((visit) => (
            <Link
              href={`/${locale}/nursing/visits/${encodeURIComponent(visit.id)}`}
              className={styles.card}
              key={visit.id}
            >
              <span className={styles.icon}>
                <VectorNursing size={32} aria-hidden="true" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2>{visit.serviceName || t("visit")}</h2>
                {visit.providerName ? <p>{visit.providerName}</p> : null}
                {visit.scheduledAt ? (
                  <p className={styles.meta}>
                    <CalendarDays size={14} aria-hidden="true" />
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(visit.scheduledAt))}
                  </p>
                ) : null}
                {visit.status ? <span className={styles.status}>{visit.status}</span> : null}
              </div>
              <Arrow size={18} color="#64748B" aria-hidden="true" style={{ alignSelf: "center" }} />
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
