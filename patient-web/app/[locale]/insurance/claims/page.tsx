import { VectorInsurance } from "@/components-next/vector-illustrations";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, FileCheck2 } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { parseClaims } from "@/lib/api/claims";
import styles from "../insurance.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function InsuranceClaimsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Insurance");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/insurance/claims/my", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  if (!res.ok) {
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
        <section className={styles.state} role="alert"><span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorInsurance size={48} aria-hidden="true" /></span><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section>
      </main>
    );
  }
  const claims = parseClaims(await res.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{locale === "ar" ? "التأمين" : "Insurance"}</Link>
      <section className={styles.claimsSection} aria-labelledby="claims-title">
        <div className={styles.claimsHeading}>
          <div>
            <p className={styles.eyebrow}><FileCheck2 size={15} aria-hidden="true" />{t("claimsEyebrow")}</p>
            <h2 id="claims-title">{t("claimsTitle")}</h2>
          </div>
          <Link href={`/${locale}/insurance/submit-claim`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" } as React.CSSProperties}>{locale === "ar" ? "مطالبة جديدة" : "New claim"}</Link>
        </div>
        {claims.length === 0 ? (
          <div className={styles.state}><p>{t("claimsEmpty")}</p></div>
        ) : (
          <div className={styles.claimsList}>
            {claims.map((claim) => (
              <article className={styles.claimCard} key={claim.id}>
                <div className={styles.claimTop}>
                  <strong className={styles.claimService}>{claim.service || t("claimServiceUnknown")}</strong>
                  <span className={styles.status}>{claim.status || t("claimStatus.unknown")}</span>
                </div>
                {claim.date ? <p className={styles.date}><CalendarDays size={14} aria-hidden="true" />{claim.date}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
