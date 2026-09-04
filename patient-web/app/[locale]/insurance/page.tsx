import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, ChevronLeft, FileCheck2, ShieldCheck } from "lucide-react";
import { getPatientClaims } from "@/lib/api/claims-server";
import { parseClaims } from "@/lib/api/claims";
import { getPatientInsuranceBenefits, getPatientInsurancePolicy } from "@/lib/api/insurance-server";
import { parseInsuranceSummary } from "@/lib/api/insurance";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorInsurance } from "@/components-next/vector-illustrations";
import styles from "./insurance.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function InsurancePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Insurance");
  const token = await requirePatientAccess(locale);
  const [policyResponse, benefitsResponse, claimsResponse] = await Promise.all([
    getPatientInsurancePolicy(token),
    getPatientInsuranceBenefits(token),
    getPatientClaims(token),
  ]);
  if ([policyResponse, benefitsResponse, claimsResponse].some((r) => r.status === 401)) redirect(`/${locale}/login`);
  if ([policyResponse, benefitsResponse, claimsResponse].some((r) => r.status === 403 || r.status === 404)) notFound();
  if (!policyResponse.ok || !benefitsResponse.ok || !claimsResponse.ok)
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <VectorInsurance size={42} aria-hidden="true" />
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
        </section>
      </main>
    );

  const summary = parseInsuranceSummary(await policyResponse.json().catch(() => null));
  const claims = parseClaims(await claimsResponse.json().catch(() => null));
  if (!summary)
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <VectorInsurance size={42} aria-hidden="true" />
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
        </section>
      </main>
    );

  const statusLabel = (status?: string) =>
    status ? t(`claimStatus.${status}` as "claimStatus.pending") : t("claimStatus.unknown");

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/dashboard`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {locale === "ar" ? "لوحة التحكم" : "Dashboard"}
      </Link>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1>{t("title")}</h1>
          <p>{t("notice")}</p>
        </div>
        <span className={styles.heroVector}>
          <VectorInsurance size={48} aria-hidden="true" />
        </span>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <span>{t("policyStatus")}</span>
          <strong style={{ color: summary.hasPolicy ? "#00876F" : "var(--ink)" }}>
            {summary.hasPolicy ? t("active") : t("none")}
          </strong>
        </div>
        {summary.companyName ? (
          <div className={styles.card}>
            <span>{t("company")}</span>
            <strong>{summary.companyName}</strong>
          </div>
        ) : null}
        {summary.planClass ? (
          <div className={styles.card}>
            <span>{t("plan")}</span>
            <strong>{summary.planClass}</strong>
          </div>
        ) : null}
      </section>

      <section className={styles.claimsSection} aria-labelledby="claims-title">
        <div className={styles.claimsHeading}>
          <div>
            <p className={styles.eyebrow}>
              <FileCheck2 size={15} aria-hidden="true" />
              {t("claimsEyebrow")}
            </p>
            <h2 id="claims-title">{t("claimsTitle")}</h2>
          </div>
          <p>{t("claimsNotice")}</p>
        </div>

        {claims.length === 0 ? (
          <div className={styles.state}>
            <VectorInsurance size={40} aria-hidden="true" />
            <p>{t("claimsEmpty")}</p>
          </div>
        ) : (
          <div className={styles.claimsList}>
            {claims.map((claim) => (
              <article className={styles.claimCard} key={claim.id}>
                <div className={styles.claimTop}>
                  <strong className={styles.claimService}>{claim.service || t("claimServiceUnknown")}</strong>
                  <span className={styles.status}>{statusLabel(claim.status)}</span>
                </div>
                {claim.date ? (
                  <p className={styles.date}>
                    <CalendarDays size={14} aria-hidden="true" />
                    {claim.date}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
