import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { extractNursingVisits } from "@/lib/api/nursing-visits";
import { getPatientNursingVisits } from "@/lib/api/nursing-visits-server";
import { isLocale } from "@/lib/i18n";
import { VectorNursing } from "@/components-next/vector-illustrations";
import styles from "./visits.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function NursingVisitsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingVisits");
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  let visits: any[] = [];
  try {
    const { cookies } = await import("next/headers");
    const { authCookieNames } = await import("@/lib/auth/cookies");
    const token = (await cookies()).get(authCookieNames.access)?.value;
    if (token) {
      const response = await getPatientNursingVisits(token);
      if (response.ok) {
        visits = extractNursingVisits(await response.json().catch(() => null));
      }
    }
  } catch {}

  return (
    <main className={`main ${styles.page}`} dir={rtl ? "rtl" : "ltr"} style={{ background: "#FDFDFC" }}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
           <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("title")}</h1>
           <p className={styles.subtitle} style={{ overflowWrap: "anywhere" }}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon}>
          <VectorNursing size={48} aria-hidden="true" />
        </span>
      </section>

      {visits.length === 0 ? (
         <section className={styles.state}>
           <VectorNursing size={48} aria-hidden="true" />
           <h2 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("empty")}</h2>
          <Link href={`/${locale}/nursing/catalog`} className={styles.status} style={{ marginTop: 12, padding: "8px 16px", textDecoration: "none", background: "#5FD9B3", color: "#1E332E", border: "1px solid #E8EDEE", borderRadius: 20 }}>
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
                <VectorNursing size={48} aria-hidden="true" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{visit.serviceName || t("visit")}</h2>
                {visit.providerName ? <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{visit.providerName}</p> : null}
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
