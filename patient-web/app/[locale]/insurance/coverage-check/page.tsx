import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import styles from "../insurance.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ service_type?: string; q?: string }> };

export default async function InsuranceCoverageCheckPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Insurance");
  const token = await requirePatientAccess(locale);
  const serviceType = (sp.service_type || sp.q || "").trim();
  let result: unknown = null;
  if (serviceType) {
    const res = await callPatientApi(`/insurance/coverage-check?service_type=${encodeURIComponent(serviceType)}`, {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (res.status === 403 || res.status === 404) notFound();
    result = res.ok ? await res.json().catch(() => null) : null;
  }

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{locale === "ar" ? "التأمين" : "Insurance"}</Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{locale === "ar" ? "فحص التغطية التأمينية" : "Coverage check"}</h1>
          <p>{locale === "ar" ? "تحقق حي من الخادم — القرار المحلي ليس اعتماداً من شركة التأمين." : "Live server check — a local decision is not a payer approval."}</p>
        </div>
      </section>
      <form method="get" style={{ display: "flex", gap: 8 }}>
        <input name="service_type" defaultValue={serviceType} placeholder={locale === "ar" ? "نوع الخدمة: consultation / pharmacy / lab" : "Service type"} />
        <button type="submit">{locale === "ar" ? "فحص" : "Check"}</button>
      </form>
      {serviceType ? (
        result ? <pre dir="ltr" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre> : <p role="alert">{t("unavailable")}</p>
      ) : null}
    </main>
  );
}
