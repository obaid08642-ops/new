import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { parseCoverage, type CoverageResult } from "@/lib/insurance/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Notice } from "@/components-next/consult/consult-parts";
import { StatusBadge } from "@/components-next/insurance/insurance-kit";
import forms from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/insurance/insurance.module.css";

const SERVICES = ["consultation", "pharmacy", "lab"] as const;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ service_type?: string; q?: string }> };

/**
 * "Does my insurance cover this?" (merge map 2, section 6; the old benefits-summary page is the Benefits tab of the hub):
 * GET /insurance/coverage-check?service_type=… and the answer as the server gives it. It is a first check, not an approval.
 */
export default async function InsuranceCoverageCheckPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("InsuranceWeb");
  const token = await requirePatientAccess(locale);
  const serviceType = (sp.service_type || sp.q || "").trim();
  let result: CoverageResult | null = null;
  let failed = false;
  if (serviceType) {
    try {
      const res = await callPatientApi(`/insurance/coverage-check?service_type=${encodeURIComponent(serviceType)}`, {}, token);
      if (res.status === 401) redirect(`/${locale}/login`);
      if (res.status === 403 || res.status === 404) notFound();
      result = res.ok ? parseCoverage(await res.json().catch(() => null)) : null;
    } catch (error) {
      if (error && typeof error === "object" && "digest" in error) throw error;
    }
    failed = !result;
  }

  return (
    <ConsultPage locale={locale} title={t("coverage.title")} backHref={`/${locale}/insurance`}>
      <Notice>{t("coverage.lead")}</Notice>
      <form method="get" className={`${rx.card} ${forms.stack}`} role="search" aria-label={t("coverage.title")}>
        <div className={styles.search}>
          <label className={`${forms.field} ${styles.searchField}`}>
            <span className={forms.label}>{t("coverage.service")}</span>
            <select className={forms.control} name="service_type" defaultValue={serviceType || "consultation"}>
              {SERVICES.map((service) => <option key={service} value={service}>{t(`coverage.svc.${service}`)}</option>)}
              {serviceType && !SERVICES.includes(serviceType as (typeof SERVICES)[number]) ? <option value={serviceType}>{serviceType}</option> : null}
            </select>
          </label>
          <button type="submit" className="nabd-button nabd-button--primary nabd-button--lg"><span className="nabd-button__label">{t("coverage.check")}</span></button>
        </div>
      </form>
      {failed ? <div role="alert"><Notice warn>{t("partUnavailable")}</Notice></div> : null}
      {result ? (
        <section className={rx.card} aria-label={t("coverage.result")} role="status">
          <StatusBadge tone={result.eligible ? "good" : "bad"}>{result.eligible ? t("coverage.eligible") : t("coverage.notEligible")}</StatusBadge>
          {result.serviceType ? <p className={rx.lead}>{t("coverage.forService", { service: result.serviceType })}</p> : null}
          {result.note ? <p className={rx.lead}>{result.note}</p> : null}
        </section>
      ) : null}
    </ConsultPage>
  );
}
