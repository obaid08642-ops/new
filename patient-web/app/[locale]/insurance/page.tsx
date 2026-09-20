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
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
        <section className={styles.state} role="alert" style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8 } as React.CSSProperties}>
          <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties} aria-hidden="true"><VectorInsurance size={48} aria-hidden="true" /></span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailableTitle")}</h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as React.CSSProperties}>{t("unavailable")}</p>
        </section>
      </main>
    );

  const summary = parseInsuranceSummary(await policyResponse.json().catch(() => null));
  const claims = parseClaims(await claimsResponse.json().catch(() => null));
  if (!summary)
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
        <section className={styles.state} role="alert" style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8 } as React.CSSProperties}>
          <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties} aria-hidden="true"><VectorInsurance size={48} aria-hidden="true" /></span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailableTitle")}</h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as React.CSSProperties}>{t("unavailable")}</p>
        </section>
      </main>
    );

  const statusLabel = (status?: string) =>
    status ? t(`claimStatus.${status}` as "claimStatus.pending") : t("claimStatus.unknown");

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <Link href={`/${locale}/dashboard`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {locale === "ar" ? "لوحة التحكم" : "Dashboard"}
      </Link>

      <section className={styles.hero} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" } as React.CSSProperties}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("title")}</h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("notice")}</p>
        </div>
        <span className={styles.heroVector}>
          <VectorInsurance size={48} aria-hidden="true" />
        </span>
      </section>
      <span style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", display: "inline-flex", gap: 8, alignItems: "center" } as React.CSSProperties} aria-hidden="true" />
      <nav aria-label={locale === "ar" ? "خدمات التأمين" : "Insurance services"} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <Link href={`/${locale}/insurance/add-policy`}>{locale === "ar" ? "إضافة وثيقة" : "Add policy"}</Link>
        <Link href={`/${locale}/insurance/submit-claim`}>{locale === "ar" ? "تقديم مطالبة" : "Submit claim"}</Link>
        <Link href={`/${locale}/insurance/claims`}>{locale === "ar" ? "تتبع المطالبات" : "Track claims"}</Link>
        <Link href={`/${locale}/insurance/coverage-check`}>{locale === "ar" ? "فحص التغطية" : "Coverage check"}</Link>
        <Link href={`/${locale}/insurance/network-providers`}>{locale === "ar" ? "مزودو الشبكة" : "Network providers"}</Link>
        <Link href={`/${locale}/insurance/benefits`}>{locale === "ar" ? "المزايا" : "Benefits"}</Link>
        <Link href={`/${locale}/insurance/policy-detail`}>{locale === "ar" ? "تفاصيل الوثيقة" : "Policy details"}</Link>
        <Link href={`/${locale}/insurance/refunds`}>{locale === "ar" ? "الاسترداد" : "Refunds"}</Link>
      </nav>

      <section className={styles.grid}>
        <div className={styles.card}>
          <span>{t("policyStatus")}</span>
          <strong style={{ color: summary.hasPolicy ? "#1E332E" : "var(--ink)" }}>
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
