import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { getPatientClaims } from "@/lib/api/claims-server";
import { parseClaims } from "@/lib/api/claims";
import { getPatientInsuranceBenefits, getPatientInsurancePolicy } from "@/lib/api/insurance-server";
import { parseInsuranceSummary } from "@/lib/api/insurance";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
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
  if (!policyResponse.ok || !benefitsResponse.ok || !claimsResponse.ok) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;
  const summary = parseInsuranceSummary(await policyResponse.json().catch(() => null));
  const claims = parseClaims(await claimsResponse.json().catch(() => null));
  if (!summary) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;
  const statusLabel = (status?: string) => status ? t(`claimStatus.${status}` as "claimStatus.pending") : t("claimStatus.unknown");
  return <main className="main">
    <section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></section>
    <section className={styles.grid}><div className={styles.card}><span>{t("policyStatus")}</span><strong>{summary.hasPolicy ? t("active") : t("none")}</strong></div>{summary.companyName ? <div className={styles.card}><span>{t("company")}</span><strong>{summary.companyName}</strong></div> : null}{summary.planClass ? <div className={styles.card}><span>{t("plan")}</span><strong>{summary.planClass}</strong></div> : null}</section>
    <section className={styles.claimsSection} aria-labelledby="claims-title"><div className={styles.claimsHeading}><div><p className={styles.eyebrow}><FileCheck2 size={15} aria-hidden="true" />{t("claimsEyebrow")}</p><h2 id="claims-title">{t("claimsTitle")}</h2></div><p>{t("claimsNotice")}</p></div>
      {claims.length === 0 ? <div className={styles.state}><p>{t("claimsEmpty")}</p></div> : <div className={styles.claimsList}>{claims.map((claim) => <a key={claim.id} href={`/${locale}/insurance/requests/${encodeURIComponent(claim.id)}`} className={styles.card} style={{ display: "block", textDecoration: "none", color: "inherit" }}><div className={styles.claimTop}><strong>{claim.service || t("claimServiceUnknown")}</strong><span className={styles.status}>{statusLabel(claim.status)}</span></div>{claim.date ? <p className={styles.date}>{claim.date}</p> : null}</a>)}</div>}
    </section>
  </main>;
}
