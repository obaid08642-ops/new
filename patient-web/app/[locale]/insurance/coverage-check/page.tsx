import { VectorInsurance } from "@/components-next/vector-illustrations";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import styles from "../insurance.module.css";
import { COVERAGE_SERVICE_TYPES, coverageView, serviceLabel } from "@/lib/insurance-f2";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ service_type?: string; q?: string }> };

export default async function InsuranceCoverageCheckPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Insurance");
  const token = await requirePatientAccess(locale);
  const requested = (sp.service_type || sp.q || "").trim();
  const serviceType = (COVERAGE_SERVICE_TYPES as readonly string[]).includes(requested) ? requested : "";
  let result: unknown = null;
  if (serviceType) {
    const res = await callPatientApi(`/insurance/coverage-check?service_type=${encodeURIComponent(serviceType)}`, {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (res.status === 403 || res.status === 404) notFound();
    result = res.ok ? await res.json().catch(() => null) : null;
  }

  const view = serviceType ? coverageView(result, serviceType, locale) : null;

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{locale === "ar" ? "التأمين" : "Insurance"}</Link>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{locale === "ar" ? "فحص التغطية التأمينية" : "Coverage check"}</h1>
          <p>{locale === "ar" ? "نبض+ لا يعتمد المطالبات: مقدم الخدمة يطلب موافقة شركة التأمين من نظامه ويسجّل القرار، ثم تدفع نسبة التحمل إن وُجدت." : "Nabd+ does not approve claims: the provider gets the insurer's approval in its own system and records the decision; you then pay any copay."}</p>
        </div>
              <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorInsurance size={48} aria-hidden="true" /></span>
      <span style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", display: "inline-flex", gap: 8, alignItems: "center" } as React.CSSProperties} aria-hidden="true" />
      </section>
      <form method="get" style={{ display: "flex", gap: 8 }}>
        <select name="service_type" defaultValue={serviceType} aria-label={locale === "ar" ? "نوع الخدمة" : "Service type"}>
          {COVERAGE_SERVICE_TYPES.map((s) => <option key={s} value={s}>{serviceLabel(s, locale)}</option>)}
        </select>
        <button type="submit">{locale === "ar" ? "فحص" : "Check"}</button>
      </form>
      {serviceType ? (
        view ? (
          <section role="status" style={{ border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, background: view.covered ? "rgba(95,217,179,.16)" : "rgba(240,105,92,.12)", display: "grid", gap: 8 }}>
            <h2 style={{ color: "#1E332E", margin: 0 }}>{view.title}</h2>
            {view.company ? <p style={{ margin: 0 }}>{view.company}</p> : null}
            {view.reason ? <p style={{ margin: 0 }}>{view.reason}</p> : null}
            {view.covered && view.acceptingProviders != null ? (
              <Link href={`/${locale}/insurance/network-providers`}>{locale === "ar" ? "عرض مقدمي الخدمة الذين يقبلون تأمينك" : "See providers that accept your insurer"}</Link>
            ) : null}
          </section>
        ) : <p role="alert">{t("unavailable")}</p>
      ) : null}
    </main>
  );
}
